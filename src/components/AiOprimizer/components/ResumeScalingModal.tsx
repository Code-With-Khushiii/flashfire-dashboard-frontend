import React, { useState, useRef, useEffect, useContext } from "react";
import { X, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { UserContext } from "../../../state_management/UserContext";

interface ResumeScalingModalProps {
    isOpen: boolean;
    onClose: () => void;
    resumeContent: React.ReactNode;
    resumeData: any;
    version: number; // 0 = standard, 1 = hybrid, 2 = medical
}

// US Letter size: 8.5" x 11" = 816px x 1056px at 96 DPI
const PAGE_WIDTH_PX = 816; // 8.5 inches
const PAGE_HEIGHT_PX = 1056; // 11 inches
const DPI = 96;

// Minimum portion of the printable page the content MUST fill before it can be
// downloaded. Prevents operators from scaling a resume so small that the first
// page is half-empty and looks unprofessional.
const MIN_FILL_RATIO = 0.9; // 90%

export const ResumeScalingModal: React.FC<ResumeScalingModalProps> = ({
    isOpen,
    onClose,
    resumeContent,
    resumeData,
    version,
}) => {
    const ctx = useContext(UserContext);
    const userType = ctx?.userDetails?.userType;
    const userRole = localStorage.getItem('role');
    const isAdmin =
        userType === "Admin" ||
        userType === "Operations" ||
        userType === "admin" ||
        userType === "operations" ||
        userRole === "admin" ||
        userRole === "Admin" ||
        userRole === "operations" ||
        userRole === "Operations";

    // The minimum-fill rule applies only to operations/operator accounts.
    // Regular users are never blocked or shown the "page too empty" warning.
    const isOperator = [userType, userRole].some((r) => {
        const n = typeof r === "string" ? r.trim().toLowerCase() : "";
        return n === "operations" || n === "operator";
    });

    const [overallScale, setOverallScale] = useState(100); // Percentage
    const [pageMargin, setPageMargin] = useState(0.2); // Inches
    const [pagePadding, setPagePadding] = useState(0.40); // Inches
    const [fontSize, setFontSize] = useState(9); // Points (pt) - default 9pt for medical
    const previewRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState(0);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // NEW: Custom Filename State
    const [customFilename, setCustomFilename] = useState("");

    useEffect(() => {
        if (resumeData?.personalInfo?.name) {
            const name = resumeData.personalInfo.name;
            const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
            setCustomFilename(`${cleanName}_Optimized_Resume`);
        } else {
            setCustomFilename("Resume");
        }
    }, [resumeData]);

    // Calculate available content height
    const marginPx = pageMargin * DPI;
    const paddingPx = pagePadding * DPI;
    const availableHeight = PAGE_HEIGHT_PX - (marginPx * 2) - (paddingPx * 2);
    // Blue line: where content should fit (top padding + available height)
    const blueLinePosition = paddingPx + availableHeight;
    // Red line: absolute overflow boundary (bottom of page minus bottom margin)
    const redLinePosition = PAGE_HEIGHT_PX - marginPx;
    // Printable region runs from the top padding down to the overflow boundary.
    const printableHeight = redLinePosition - paddingPx;
    // Amber line: the minimum-fill mark. Content must reach at least this far down.
    const minFillLinePosition = paddingPx + printableHeight * MIN_FILL_RATIO;

    // Inject CSS to override font sizes
    useEffect(() => {
        const styleId = 'resume-scaling-font-override';
        let styleElement = document.getElementById(styleId) as HTMLStyleElement;

        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }

        // Override font sizes for all elements within the content container
        styleElement.textContent = `
            #resume-scaling-content-container * {
                font-size: ${fontSize}pt !important;
            }
            #resume-scaling-print-only * {
                font-size: ${fontSize}pt !important;
            }
        `;

        return () => {
            // Clean up style element when component unmounts
            if (styleElement && styleElement.parentNode) {
                styleElement.parentNode.removeChild(styleElement);
            }
        };
    }, [fontSize]);

    // Update content height when scale changes
    useEffect(() => {
        if (contentRef.current) {
            // Use ResizeObserver to track content height changes
            const resizeObserver = new ResizeObserver(() => {
                if (contentRef.current) {
                    // Get the actual DOM height (unscaled)
                    const domHeight = contentRef.current.scrollHeight;
                    // Calculate visual height after scaling
                    const visualHeight = domHeight * (overallScale / 100);
                    setContentHeight(visualHeight);
                }
            });

            resizeObserver.observe(contentRef.current);

            // Also check immediately with a small delay to ensure DOM is ready
            setTimeout(() => {
                if (contentRef.current) {
                    const domHeight = contentRef.current.scrollHeight;
                    const visualHeight = domHeight * (overallScale / 100);
                    setContentHeight(visualHeight);
                }
            }, 100);

            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [overallScale, pageMargin, pagePadding, fontSize, resumeContent]);

    // Calculate if content overflows the red line (absolute overflow boundary)
    // Red line is positioned at PAGE_HEIGHT_PX - marginPx from top of preview container
    // Content starts at paddingPx from top of container
    // Content overflows red line if: paddingPx + contentHeight > redLinePosition
    const isOverflowing = (paddingPx + contentHeight) > redLinePosition;

    // How much of the printable region the content actually fills (0–1+).
    const fillRatio = printableHeight > 0 ? contentHeight / printableHeight : 0;
    // Underfilled = content is too short to look good (and not already overflowing).
    // contentHeight === 0 means we haven't measured yet, so don't flag it as underfilled.
    // Only enforced for operators; regular users are never blocked by the fill rule.
    const isUnderfilled = isOperator && !isOverflowing && contentHeight > 0 && fillRatio < MIN_FILL_RATIO;
    // Download is only allowed when the page is neither overflowing nor underfilled.
    const canDownload = !isOverflowing && !isUnderfilled;

    const handleDownloadPDF = async () => {
        if (!previewRef.current) {
            console.error("Preview element not found");
            return;
        }

        // Hard guard: never let an overflowing or under-filled page be downloaded,
        // even if the button somehow gets clicked while disabled.
        if (isOverflowing) {
            alert("Content overflows the page. Reduce the scale, font size, or content before downloading.");
            return;
        }
        if (isUnderfilled) {
            alert(
                `The page is only ${Math.round(fillRatio * 100)}% full. ` +
                `At least ${Math.round(MIN_FILL_RATIO * 100)}% of the page must contain content before you can download. ` +
                `Increase the scale or font size, or add more content.`
            );
            return;
        }

        setIsGeneratingPDF(true);

        try {
            const previewElement = previewRef.current;

            // Hide the indicator lines during PDF generation
            const indicatorLines = previewElement.querySelectorAll('.pdf-indicator-line') as NodeListOf<HTMLElement>;
            indicatorLines.forEach(line => {
                line.style.display = 'none';
            });

            // Use html2canvas to capture the preview with all styles
            // Capture only the page preview container, not the entire modal
            const canvas = await html2canvas(previewElement, {
                scale: 2, // Higher quality for crisp text
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: previewElement.offsetWidth,
                height: previewElement.offsetHeight,
                windowWidth: previewElement.scrollWidth,
                windowHeight: previewElement.scrollHeight,
                allowTaint: true,
            });

            // Restore indicator lines visibility
            indicatorLines.forEach(line => {
                line.style.display = '';
            });

            // Calculate PDF dimensions (US Letter: 8.5" x 11")
            const pdfWidth = 8.5; // inches
            const pdfHeight = 11; // inches
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'in',
                format: [pdfWidth, pdfHeight],
            });

            // Calculate scaling to fit the canvas into the PDF
            // The preview element already has the correct dimensions with margins
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            // Fit to one page - scale down if needed
            let finalHeight = imgHeight;
            let finalWidth = imgWidth;
            let xOffset = 0;
            let yOffset = 0;

            if (imgHeight > pdfHeight) {
                // Scale down to fit one page
                const scale = pdfHeight / imgHeight;
                finalHeight = pdfHeight;
                finalWidth = imgWidth * scale;
                xOffset = (pdfWidth - finalWidth) / 2; // Center horizontally
            }

            // Add the image to PDF
            const imgData = canvas.toDataURL('image/png', 1.0);
            pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');

            // Generate filename using custom input
            let filename = customFilename.trim() || "Resume";
            if (!filename.toLowerCase().endsWith(".pdf")) {
                filename += ".pdf";
            }

            // Save the PDF
            pdf.save(filename);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <Download className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">In-House PDF Scaling</h2>
                            <p className="text-blue-100 text-sm">Adjust scale, font size, margins, and padding for perfect PDF output</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel - Controls */}
                    <div className="w-80 border-r border-gray-200 bg-gray-50 p-6 overflow-y-auto">
                        <div className="space-y-6">
                            {/* Overall Scale */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    File Name
                                </label>
                                <input
                                    type="text"
                                    value={customFilename}
                                    onChange={(e) => setCustomFilename(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                                    placeholder="Enter filename (e.g., John-Doe-Resume)"
                                />

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Overall Scale: {overallScale}%
                                </label>
                                {/* <input
                                    type="range"
                                    min="60"
                                    max="120"
                                    step="1"
                                    value={overallScale}
                                    onChange={(e) => setOverallScale(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                /> 
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>60%</span>
                                    <span>120%</span>
                                </div> */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setOverallScale(Math.max(60, overallScale - 1))}
                                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-bold"
                                    >-</button>
                                    <input
                                        type="number"
                                        min="60"
                                        max="120"
                                        value={overallScale}
                                        onChange={(e) => {
                                            const val = Math.min(120, Math.max(60, Number(e.target.value)));
                                            setOverallScale(val);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={() => setOverallScale(Math.min(120, overallScale + 1))}
                                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-bold"
                                    >+</button>
                                </div>
                            </div>

                            {/* Font Size */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Font Size: {fontSize}pt
                                </label>
                                <input
                                    type="range"
                                    min="7"
                                    max="14"
                                    step="0.5"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>7pt</span>
                                    <span>14pt</span>
                                </div>
                                <input
                                    type="number"
                                    min="7"
                                    max="14"
                                    step="0.5"
                                    value={fontSize}
                                    onChange={(e) => {
                                        const val = Math.min(14, Math.max(7, Number(e.target.value)));
                                        setFontSize(val);
                                    }}
                                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Page Margin - Admin/Operations Only */}
                            {isAdmin && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Page Margin: {pageMargin.toFixed(2)}in
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="0.5"
                                        step="0.05"
                                        value={pageMargin}
                                        onChange={(e) => setPageMargin(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0.1in</span>
                                        <span>0.5in</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0.1"
                                        max="0.5"
                                        step="0.05"
                                        value={pageMargin}
                                        onChange={(e) => {
                                            const val = Math.min(0.5, Math.max(0.1, Number(e.target.value)));
                                            setPageMargin(val);
                                        }}
                                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            {/* Page Padding - Admin/Operations Only */}
                            {isAdmin && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Page Padding: {pagePadding.toFixed(2)}in
                                    </label>
                                    <input
                                        type="range"
                                        min="0.15"
                                        max="0.5"
                                        step="0.05"
                                        value={pagePadding}
                                        onChange={(e) => setPagePadding(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0.15in</span>
                                        <span>0.5in</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0.15"
                                        max="0.5"
                                        step="0.05"
                                        value={pagePadding}
                                        onChange={(e) => {
                                            const val = Math.min(0.5, Math.max(0.15, Number(e.target.value)));
                                            setPagePadding(val);
                                        }}
                                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            {/* Status Indicator */}
                            <div className={`p-4 rounded-lg ${
                                isOverflowing
                                    ? 'bg-red-50 border border-red-200'
                                    : isUnderfilled
                                        ? 'bg-amber-50 border border-amber-200'
                                        : 'bg-green-50 border border-green-200'
                            }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-3 h-3 rounded-full ${
                                        isOverflowing ? 'bg-red-500' : isUnderfilled ? 'bg-amber-500' : 'bg-green-500'
                                    }`}></div>
                                    <span className={`text-sm font-semibold ${
                                        isOverflowing ? 'text-red-700' : isUnderfilled ? 'text-amber-700' : 'text-green-700'
                                    }`}>
                                        {isOverflowing
                                            ? 'Content Overflow Detected'
                                            : isUnderfilled
                                                ? 'Page Too Empty'
                                                : 'Content Fits Perfectly'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600">
                                    {isOverflowing
                                        ? `Content height: ${((paddingPx + contentHeight) / DPI).toFixed(2)}" exceeds overflow boundary: ${(redLinePosition / DPI).toFixed(2)}"`
                                        : isUnderfilled
                                            ? `Page is only ${Math.round(fillRatio * 100)}% full. At least ${Math.round(MIN_FILL_RATIO * 100)}% must be filled — increase the scale or font size, or add more content.`
                                            : `Page is ${Math.round(fillRatio * 100)}% full (${((paddingPx + contentHeight) / DPI).toFixed(2)}" / ${(redLinePosition / DPI).toFixed(2)}")`}
                                </p>
                            </div>

                            {/* Download PDF Button */}
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF || !canDownload}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isGeneratingPDF ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Generating PDF...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5" />
                                        <span>Download PDF</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="flex-1 overflow-auto bg-gray-100 p-6 flex items-start justify-center">
                        <div className="relative">
                            {/* Page Preview Container */}
                            <div
                                ref={previewRef}
                                className="relative bg-white shadow-2xl"
                                style={{
                                    width: `${PAGE_WIDTH_PX}px`,
                                    height: `${PAGE_HEIGHT_PX}px`,
                                    margin: `${marginPx}px`,
                                    padding: `${paddingPx}px`,
                                    boxSizing: 'border-box',
                                }}
                            >
                                {/* Amber Line - Minimum fill mark (operators only) */}
                                {isOperator && (
                                    <div
                                        className="absolute left-0 right-0 z-10 pointer-events-none pdf-indicator-line"
                                        style={{
                                            top: `${minFillLinePosition}px`,
                                            borderTop: '2px dashed #f59e0b',
                                            boxShadow: '0 0 4px rgba(245, 158, 11, 0.4)',
                                        }}
                                    >
                                        <div className="absolute -left-24 top-0 bg-amber-500 text-white text-xs px-2 py-1 rounded font-semibold whitespace-nowrap shadow-lg">
                                            ↑ Min Fill ({Math.round(MIN_FILL_RATIO * 100)}%)
                                        </div>
                                    </div>
                                )}

                                {/* Red Line - Overflow boundary */}
                                <div
                                    className="absolute left-0 right-0 z-10 pointer-events-none pdf-indicator-line"
                                    style={{
                                        top: `${redLinePosition}px`,
                                        borderTop: '3px solid #ef4444',
                                        boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
                                    }}
                                >
                                    <div className="absolute -left-24 top-0 bg-red-600 text-white text-xs px-2 py-1 rounded font-semibold whitespace-nowrap shadow-lg">
                                        ⚠ Overflow Boundary
                                    </div>
                                </div>

                                {/* Resume Content */}
                                <div
                                    id="resume-scaling-content-container"
                                    ref={contentRef}
                                    style={{
                                        transform: `scale(${overallScale / 100})`,
                                        transformOrigin: 'top left',
                                        width: `${100 / (overallScale / 100)}%`,
                                        fontFamily: '"Times New Roman", Times, serif',
                                        fontSize: `${fontSize}pt`,
                                        position: 'relative',
                                    }}
                                >
                                    {resumeContent}
                                </div>

                                {/* Print-only version (hidden on screen) */}
                                <div
                                    id="resume-scaling-print-only"
                                    style={{
                                        display: 'none',
                                        transform: `scale(${overallScale / 100})`,
                                        transformOrigin: 'top left',
                                        width: `${100 / (overallScale / 100)}%`,
                                        fontFamily: '"Times New Roman", Times, serif',
                                        fontSize: `${fontSize}pt`,
                                    }}
                                >
                                    {resumeContent}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

