import React, { useRef, useEffect, useState } from "react";
import { toastUtils } from "../../../utils/toast";
import * as pdfjsLib from 'pdfjs-dist';
import { savePdf } from "../../../utils/savePdf.ts";
import { useOperationsStore } from "../../../state_management/Operations.ts";
// import { ResumeScalingModal } from "./ResumeScalingModal";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// A single-page resume must fill at least this fraction of the page height with
// real content before it can be downloaded. Stops operators from shipping
// half-empty resumes with large blank space at the bottom of the page.
const MIN_FILL_RATIO = 0.9; // 90%

/**
 * Render a PDF page to an offscreen canvas and measure how far down the page its
 * content reaches. Returns a 0-1 ratio: bottom-most non-blank pixel row / page height.
 * A page that is full top-to-bottom returns ~1.0; a mostly empty page returns a low value.
 */
async function measurePageFillRatio(
    pdf: any,
    pageNumber: number
): Promise<number | null> {
    try {
        const page = await pdf.getPage(pageNumber);
        // Modest scale keeps the pixel scan fast while staying accurate enough.
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return null;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        // Paint white first so transparent areas read as blank, not black.
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport }).promise;

        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        // A pixel counts as "content" if it is meaningfully darker than white.
        const CONTENT_THRESHOLD = 235;
        // Scan bottom-up; first row containing content is the content bottom.
        for (let y = height - 1; y >= 0; y--) {
            const rowStart = y * width * 4;
            for (let x = 0; x < width; x++) {
                const i = rowStart + x * 4;
                if (data[i] < CONTENT_THRESHOLD || data[i + 1] < CONTENT_THRESHOLD || data[i + 2] < CONTENT_THRESHOLD) {
                    return (y + 1) / height;
                }
            }
        }
        return 0; // Completely blank page.
    } catch (err) {
        console.error("Error measuring PDF fill ratio:", err);
        return null;
    }
}

interface ResumeData {
    personalInfo: {
        name: string;
        title: string;
        phone: string;
        email: string;
        location: string;
        linkedin: string;
        portfolio: string;
        github: string;
        publications: string;
        profileLinks?: Array<{ id: string; label: string; url: string }>;
    };
    summary: string;
    workExperience: Array<{
        id: string;
        position: string;
        company: string;
        duration: string;
        location: string;
        roleType: string;
        responsibilities: string[];
    }>;
    projects: Array<{
        id: string;
        position: string;
        company: string;
        duration: string;
        location: string;
        roleType: string;
        responsibilities: string[];
        linkName: string;
        linkUrl: string;
    }>;
    leadership: Array<{
        id: string;
        title: string;
        organization: string;
    }>;
    skills: Array<{
        id: string;
        category: string;
        skills: string;
    }>;
    education: Array<{
        id: string;
        institution: string;
        location: string;
        degree: string;
        field: string;
        duration: string;
        additionalInfo: string;
    }>;
    publications: Array<{
        id: string;
        details: string;
    }>;
}

interface ResumePreviewProps {
    data: ResumeData;
    showLeadership?: boolean;
    showProjects?: boolean;
    showSummary?: boolean;
    showPublications?: boolean; // Added for Publications section
    showChanges?: boolean;
    changedFields?: Set<string>;
    onDownloadClick?: () => void; // Add this prop to handle download clicks
    showPrintButtons?: boolean; // Add this prop to control print buttons visibility
    showDirectPdfButton?: boolean;
    sectionOrder?: string[]; // Add section order prop
    // Optional per-section heading overrides keyed by section id (e.g.
    // { leadership: "Awards & Volunteering" }). Missing keys fall back to
    // the hard-coded section default so old resumes render unchanged.
    sectionTitles?: Record<string, string>;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({
    data,
    showLeadership = true,
    showProjects = false,
    showSummary = true,
    showPublications = false,
    showChanges = false,
    changedFields = new Set(),
    onDownloadClick,
    showPrintButtons = true,
    showDirectPdfButton = true,
    sectionOrder = ["personalInfo", "summary", "workExperience", "projects", "leadership", "skills", "education", "publications"],
    sectionTitles = {},
}) => {
    // Resolve a heading: render the operator override uppercased, else the
    // hard-coded default. Trim guards against an accidental whitespace-only
    // override that would print as blank.
    const headingFor = (id: string, def: string): string => {
        const raw = (sectionTitles?.[id] || "").trim();
        return (raw || def).toUpperCase();
    };
    const parseCustomLinkContent = (raw: string) => {
        const content = (raw || "").trim();
        if (!content) return { label: "", href: "" };

        const pipeIndex = content.indexOf("|");
        let label = content;
        let href = content;
        if (pipeIndex !== -1) {
            label = content.slice(0, pipeIndex).trim();
            href = content.slice(pipeIndex + 1).trim();
        }

        if (!href) return { label, href: "" };

        const hasProtocol = /^(https?:\/\/|mailto:|tel:|#)/i.test(href);
        const normalizedHref = hasProtocol ? href : `https://${href}`;
        return { label: label || normalizedHref, href: normalizedHref };
    };

    const renderMarkedText = (text: string) => {
        if (!text) return null;
        const regex = /\*\*\{(.*?)\}\*\*|\*\*(.+?)\*\*|<a>([\s\S]*?)<\/a>|<a>([\s\S]*?)<a\/>/gi;
        const elements: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                elements.push(text.slice(lastIndex, match.index));
            }
            if (match[1] !== undefined || match[2] !== undefined) {
                const boldText = match[1] !== undefined ? match[1] : match[2];
                elements.push(
                    <strong key={elements.length}>
                        {boldText}
                    </strong>
                );
            } else {
                const linkRaw = match[3] !== undefined ? match[3] : match[4];
                const { label, href } = parseCustomLinkContent(linkRaw || "");
                if (href) {
                    elements.push(
                        <a
                            key={elements.length}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#2563eb", textDecoration: "none" }}
                        >
                            {label}
                        </a>
                    );
                } else {
                    elements.push(linkRaw || "");
                }
            }
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < text.length) {
            elements.push(text.slice(lastIndex));
        }
        return elements;
    };
    const [scalingFactor, setScalingFactor] = useState(1);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showScaleModal, setShowScaleModal] = useState(false);
    // Load last selected scale from localStorage
    const getLastSelectedScale = () => {
        const saved = localStorage.getItem('resumePreview_lastScale');
        return saved ? parseFloat(saved) : 1.0;
    };

    const [selectedScale, setSelectedScale] = useState(getLastSelectedScale());
    const [downloadFilename, setDownloadFilename] = useState("");
    const [originalFilename, setOriginalFilename] = useState("");
    const [showFilenameConfirmModal, setShowFilenameConfirmModal] = useState(false);
    const overrideAutoScale = true;
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
    // Fraction (0-1) of the last page's height that actually contains content.
    // Used to block downloads of sparse, mostly-empty single-page resumes.
    const [pdfFillRatio, setPdfFillRatio] = useState<number | null>(null);

    // The top-toolbar "Download PDF" button is only useful on the /optimize/:jobId
    // route. Hide it in the portal (everywhere else) — downloads there go through the
    // "Select PDF Scale" modal flow instead.
    const isOptimizeRoute =
        typeof window !== "undefined" && window.location.pathname.startsWith("/optimize");

    // The fill rule only applies to operations/operator accounts (they handle many
    // clients and misuse scaling). Regular users are never blocked or shown the warning.
    const { role: operationsRole } = useOperationsStore();
    const isOperator = (() => {
        const candidates = [operationsRole, localStorage.getItem("role")];
        return candidates.some((r) => {
            const n = typeof r === "string" ? r.trim().toLowerCase() : "";
            return n === "operations" || n === "operator";
        });
    })();

    // A single-page resume that doesn't fill enough of the page is "underfilled"
    // and must not be downloaded (too much wasted blank space at the bottom).
    // Only enforced for operators.
    const isUnderfilled =
        isOperator && pdfPageCount === 1 && pdfFillRatio !== null && pdfFillRatio < MIN_FILL_RATIO;
    // True only when the preview is a clean, well-filled single page.
    const isPageCountValid = pdfPageCount !== null && pdfPageCount === 1 && !isUnderfilled;
    // Single source of truth for whether the Download button is disabled.
    const isDownloadBlocked =
        isGeneratingPDF ||
        isGeneratingPreview ||
        !previewPdfBlob ||
        (pdfPageCount !== null && pdfPageCount > 1) ||
        isUnderfilled;

    const loadingMessages = [
        "Our PDF engine is optimizing the PDF view...",
        "Crafting your perfect resume layout...",
        "Fine-tuning typography and spacing...",
        "Ensuring pixel-perfect formatting...",
        "Applying professional styling...",
        "Optimizing content density...",
        "Perfecting page breaks and margins...",
        "Generating high-quality PDF output...",
    ];
    // const [showScalingModal, setShowScalingModal] = useState(false);
    const measureRef = useRef<HTMLDivElement>(null);

    // Enhanced print function with automatic settings
    const handlePrint = () => {
        // Show warning modal first
        setShowWarningModal(true);
    };

    // Function to handle actual printing after user confirms
    //     const handlePrintConfirm = () => {
    //         setShowWarningModal(false);

    //         // Store original title
    //         const originalTitle = document.title;

    //         // Set document title for the PDF filename
    //         document.title = `${data.personalInfo.name || "Resume"}_Resume`;

    //         // Create a style element for print-specific settings
    //         const printStyle = document.createElement("style");
    //         printStyle.innerHTML = `
    //   @media print {
    //     body {
    //       margin: 0 !important;
    //       padding: 0 !important;
    //       -webkit-print-color-adjust: exact !important;
    //       print-color-adjust: exact !important;
    //       color-adjust: exact !important;
    //       height: auto !important;
    //       max-height: none !important;
    //       overflow: visible !important;
    //     }

    //     @page {
    //       size: letter !important;
    //       margin: 0 !important;
    //     }

    //     #resume-print-only {
    //       display: flex !important;
    //       flex-direction: column !important;
    //       font-family: "Times New Roman", Times, serif !important;
    //       font-size: ${styles.fontSize} !important;
    //       line-height: ${styles.lineHeight} !important;
    //       letter-spacing: -0.025em !important;
    //       color: #000 !important;
    //       width: 100% !important;
    //       height: auto !important;
    //       min-height: auto !important;
    //       max-height: none !important;
    //       overflow: visible !important;
    //       padding: 0.2in 0.5in 0.3in 0.5in !important;
    //       box-sizing: border-box !important;
    //       page-break-inside: auto !important;
    //       page-break-before: auto !important;
    //       page-break-after: auto !important;
    //     }

    //     /* Allow natural spacing between sections */
    //     #resume-print-only > div {
    //       margin-bottom: 12px !important;
    //     }

    //     /* Allow page breaks for long content */
    //     * {
    //       page-break-before: auto !important;
    //       page-break-after: auto !important;
    //       page-break-inside: auto !important;
    //       break-inside: auto !important;
    //     }

    //     /* Prevent breaking within individual items */
    //     .work-experience-item,
    //     .project-item,
    //     .education-item {
    //       page-break-inside: avoid !important;
    //       break-inside: avoid !important;
    //     }
    //   }
    // `;

    //         document.head.appendChild(printStyle);

    //         // Function to automatically set print dialog settings
    //         const setupPrintDialog = () => {
    //             // Store original print function
    //             const originalPrint = window.print;

    //             // Override the print function
    //             window.print = function() {
    //                 // Try to use the modern Print API if available
    //                 if (navigator.userAgent.includes('Chrome') && window.chrome && window.chrome.runtime) {
    //                     try {
    //                         // For Chrome, try to use the Print API
    //                         if (window.chrome.runtime.getManifest) {
    //                             // This would require a Chrome extension
    //                             console.log('Chrome extension required for automatic print settings');
    //                         }
    //                     } catch (error) {
    //                         console.log('Chrome Print API not available:', error);
    //                     }
    //                 }

    //                 // Fallback to standard print with enhanced CSS
    //                 const enhancedPrintStyle = document.createElement("style");
    //                 enhancedPrintStyle.innerHTML = `
    //                     @media print {
    //                         @page {
    //                             size: letter !important;
    //                             margin: 0.2in 0.5in 0.5in 0.5in !important;
    //                         }

    //                         body {
    //                             margin: 0 !important;
    //                             padding: 0 !important;
    //                             -webkit-print-color-adjust: exact !important;
    //                             print-color-adjust: exact !important;
    //                         }

    //                         #resume-print-only {
    //                             display: block !important;
    //                             width: 100% !important;
    //                             height: auto !important;
    //                             overflow: visible !important;
    //                             page-break-inside: auto !important;
    //                         }

    //                         /* Force content to start immediately */
    //                         #resume-print-only > *:first-child {
    //                             margin-top: 0 !important;
    //                             padding-top: 0 !important;
    //                         }
    //                     }
    //                 `;

    //                 document.head.appendChild(enhancedPrintStyle);

    //                 // Call original print
    //                 originalPrint.call(this);

    //                 // Cleanup enhanced styles after print
    //                 setTimeout(() => {
    //                     if (document.head.contains(enhancedPrintStyle)) {
    //                         document.head.removeChild(enhancedPrintStyle);
    //                     }
    //                 }, 1000);
    //             };
    //         };

    //         // Setup the print dialog override
    //         setupPrintDialog();

    //         // Small delay to ensure styles are applied
    //         setTimeout(() => {
    //             // Open print dialog
    //             window.print();

    //             // Cleanup: restore original title and remove print styles
    //             setTimeout(() => {
    //                 document.title = originalTitle;
    //                 document.head.removeChild(printStyle);
    //                 // Restore original print function
    //                 window.print = window.print;
    //             }, 1000);
    //         }, 100);

    //         // Call the optional callback
    //         if (onDownloadClick) {
    //             onDownloadClick();
    //         }
    //     };

    // Generate preview PDF
    const generatePreview = async (scale: number) => {
        let messageInterval: NodeJS.Timeout | null = null;
        try {
            setIsGeneratingPreview(true);
            // Rotate loading messages
            messageInterval = setInterval(() => {
                setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
            }, 2000);

            const pdfServerUrl = import.meta.env.VITE_PDF_SERVER_URL || "http://localhost:8000";

            let finalSectionOrder = [...sectionOrder];
            if (showPublications && !finalSectionOrder.includes("publications")) {
                finalSectionOrder.push("publications");
            }
            if (!showPublications && finalSectionOrder.includes("publications")) {
                finalSectionOrder = finalSectionOrder.filter(id => id !== "publications");
            }

            const pdfPayload = {
                personalInfo: data.personalInfo,
                summary: data.summary || "",
                workExperience: data.workExperience || [],
                projects: data.projects || [],
                leadership: data.leadership || [],
                skills: data.skills || [],
                education: data.education || [],
                publications: data.publications || [],
                checkboxStates: {
                    showSummary: showSummary,
                    showProjects: showProjects,
                    showLeadership: showLeadership,
                    showPublications: showPublications,
                },
                sectionTitles: sectionTitles || {},
                sectionOrder: finalSectionOrder,
                scale: scale,
                overrideAutoScale: overrideAutoScale,
            };

            const response = await fetch(`${pdfServerUrl}/v1/generate-pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pdfPayload),
            });

            if (!response.ok) {
                throw new Error(`Preview generation failed: ${response.status}`);
            }

            const pdfBlob = await response.blob();
            const pdfUrl = window.URL.createObjectURL(pdfBlob);

            // Get PDF page count
            try {
                const arrayBuffer = await pdfBlob.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const numPages = pdf.numPages;
                setPdfPageCount(numPages);
                // Measure how full the last page is — operators only (the fill rule is
                // not enforced for regular users, so there's no need to scan for them).
                if (isOperator) {
                    const fillRatio = await measurePageFillRatio(pdf, numPages);
                    setPdfFillRatio(fillRatio);
                } else {
                    setPdfFillRatio(null);
                }
            } catch (pdfError) {
                console.error("Error getting PDF page count:", pdfError);
                setPdfPageCount(null);
                setPdfFillRatio(null);
            }

            // Clean up previous preview
            if (previewPdfUrl) {
                window.URL.revokeObjectURL(previewPdfUrl);
            }

            setPreviewPdfUrl(pdfUrl);
            setPreviewPdfBlob(pdfBlob); // Store blob for download
            setIsGeneratingPreview(false);
            if (messageInterval) clearInterval(messageInterval);
        } catch (error: any) {
            console.error("Error generating preview:", error);
            setIsGeneratingPreview(false);
            if (messageInterval) clearInterval(messageInterval);
        }
    };

    // Handle scale change with debounced preview
    useEffect(() => {
        if (showScaleModal && selectedScale) {
            // Reset page count when scale changes
            setPdfPageCount(null);
            setPdfFillRatio(null);
            const timer = setTimeout(() => {
                generatePreview(selectedScale);
            }, 500); // Debounce preview generation

            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedScale, showScaleModal, overrideAutoScale]);

    // Clean up preview URL when modal closes
    useEffect(() => {
        if (!showScaleModal && previewPdfUrl) {
            window.URL.revokeObjectURL(previewPdfUrl);
            setPreviewPdfUrl(null);
            setPreviewPdfBlob(null);
            setPdfPageCount(null);
            setPdfFillRatio(null);
        }
    }, [showScaleModal, previewPdfUrl]);

    // Generate preview when modal opens
    useEffect(() => {
        if (showScaleModal) {
            generatePreview(selectedScale);
        } else {
            // Clean up preview URL when modal closes
            if (previewPdfUrl) {
                window.URL.revokeObjectURL(previewPdfUrl);
                setPreviewPdfUrl(null);
            }
        }
    }, [showScaleModal]);

    useEffect(() => {
        if (data.personalInfo?.name) {
            const name = data.personalInfo.name || "Resume";
            const cleanName = name.replace(/\s+/g, "_");
            const filename = `${cleanName}_Resume.pdf`;
            setDownloadFilename(filename);
            setOriginalFilename(filename);
        }
    }, [data.personalInfo?.name]);

    // Handle copying JSON with styles
    const handleCopyJsonWithStyles = () => {
        try {
            // Get the computed styles object
            const computedStyles = {
                fontSize: styles.fontSize,
                headerSize: styles.headerSize,
                contactSize: styles.contactSize,
                sectionMargin: styles.sectionMargin,
                itemMargin: styles.itemMargin,
                bulletSpacing: styles.bulletSpacing,
                lineHeight: styles.lineHeight,
                paddingTop: styles.paddingTop,
                paddingBottom: styles.paddingBottom,
                paddingSide: styles.paddingSide,
                scalingFactor: scalingFactor,
            };

            // Create JSON structure matching PDF payload format + styles
            const jsonWithStyles = {
                // Data structure (same as PDF payload)
                personalInfo: data.personalInfo,
                summary: data.summary || "",
                workExperience: data.workExperience || [],
                projects: data.projects || [],
                leadership: data.leadership || [],
                skills: data.skills || [],
                education: data.education || [],
                publications: data.publications || [],
                checkboxStates: {
                    showSummary: showSummary,
                    showProjects: showProjects,
                    showLeadership: showLeadership,
                    showPublications: showPublications,
                },
                sectionTitles: sectionTitles || {},
                sectionOrder: sectionOrder,
                scale: selectedScale,
                overrideAutoScale: overrideAutoScale,
                // Styles information
                styles: computedStyles,
                // HTML structure styles - how divs and elements are styled
                htmlStructure: {
                    container: {
                        fontFamily: '"Times New Roman", Times, serif',
                        fontSize: styles.fontSize,
                        lineHeight: styles.lineHeight,
                        color: "#000000",
                        padding: `${styles.paddingTop} ${styles.paddingSide} ${styles.paddingBottom} ${styles.paddingSide}`,
                        letterSpacing: "-0.025em",
                    },
                    header: {
                        textAlign: "center",
                        marginBottom: styles.sectionMargin,
                    },
                    name: {
                        fontSize: styles.headerSize,
                        marginBottom: "2px",
                        fontWeight: "bold",
                        letterSpacing: "-0.025em",
                    },
                    title: {
                        fontSize: styles.contactSize,
                        marginBottom: "2px",
                        letterSpacing: "-0.025em",
                    },
                    contact: {
                        fontSize: styles.contactSize,
                        letterSpacing: "-0.025em",
                    },
                    sectionTitle: {
                        fontSize: styles.fontSize,
                        borderBottom: "1px solid #000",
                        paddingBottom: "2px",
                        marginBottom: styles.itemMargin,
                        fontWeight: "bold",
                        letterSpacing: "-0.025em",
                    },
                    sectionContent: {
                        fontSize: styles.fontSize,
                        lineHeight: styles.lineHeight,
                        letterSpacing: "-0.025em",
                    },
                    workExperienceItem: {
                        marginBottom: styles.itemMargin,
                    },
                    workExperienceHeader: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: styles.bulletSpacing,
                    },
                    companyName: {
                        fontSize: styles.fontSize,
                        fontWeight: "bold",
                        letterSpacing: "-0.025em",
                        lineHeight: styles.lineHeight,
                    },
                    position: {
                        fontSize: styles.fontSize,
                        letterSpacing: "-0.025em",
                        lineHeight: styles.lineHeight,
                    },
                    location: {
                        textAlign: "right",
                        marginLeft: "20px",
                        fontSize: styles.fontSize,
                        letterSpacing: "-0.025em",
                        lineHeight: styles.lineHeight,
                    },
                    bulletPoint: {
                        display: "flex",
                        alignItems: "flex-start",
                        marginBottom: styles.bulletSpacing,
                    },
                    bullet: {
                        fontSize: styles.fontSize,
                        marginRight: "4px",
                        minWidth: "8px",
                    },
                    bulletText: {
                        textAlign: "justify",
                        fontSize: styles.fontSize,
                        lineHeight: styles.lineHeight,
                        letterSpacing: "-0.025em",
                    },
                    skillsCategory: {
                        fontSize: Math.max(11, Math.round(13 * scalingFactor)) + "px",
                        marginBottom: styles.bulletSpacing,
                        lineHeight: styles.lineHeight,
                        letterSpacing: "-0.025em",
                        display: "flex",
                        alignItems: "flex-start",
                    },
                    skillsLabel: {
                        width: "160px",
                        flexShrink: 0,
                        fontWeight: "bold",
                        letterSpacing: "-0.025em",
                    },
                    link: {
                        color: "blue",
                        textDecoration: "none",
                    },
                    educationItem: {
                        marginBottom: styles.itemMargin,
                    },
                    educationHeader: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: styles.bulletSpacing,
                    },
                    institution: {
                        fontSize: styles.fontSize,
                        fontWeight: "bold",
                        letterSpacing: "-0.025em",
                        lineHeight: styles.lineHeight,
                    },
                    degree: {
                        fontSize: styles.fontSize,
                        letterSpacing: "-0.025em",
                        lineHeight: styles.lineHeight,
                    },
                    projectItem: {
                        marginBottom: styles.itemMargin,
                    },
                    projectHeader: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: styles.bulletSpacing,
                    },
                    projectName: {
                        fontSize: styles.fontSize,
                        fontWeight: "bold",
                        letterSpacing: "-0.025em",
                        lineHeight: styles.lineHeight,
                        color: "#000",
                        fontStyle: "normal",
                    },
                    publicationItem: {
                        display: "flex",
                        alignItems: "flex-start",
                        marginBottom: styles.bulletSpacing,
                    },
                    leadershipItem: {
                        fontSize: styles.fontSize,
                        marginBottom: styles.bulletSpacing,
                        letterSpacing: "-0.025em",
                        lineHeight: styles.lineHeight,
                    },
                },
            };

            // Convert to JSON string with proper formatting
            const jsonString = JSON.stringify(jsonWithStyles, null, 2);

            // Copy to clipboard
            navigator.clipboard.writeText(jsonString).then(() => {
                toastUtils.success("✅ JSON with styles copied to clipboard!");
            }).catch((err) => {
                console.error("Failed to copy:", err);
                toastUtils.error("Failed to copy JSON to clipboard");
            });
        } catch (error: any) {
            console.error("Error copying JSON with styles:", error);
            toastUtils.error(`Failed to copy JSON: ${error.message}`);
        }
    };

    // Handle PDF download - use the preview PDF if available
    const handleDownloadResume = async () => {
        try {
            // Hard guards: never download a multi-page or under-filled (mostly blank) resume,
            // even if the button is somehow triggered while it should be disabled.
            if (pdfPageCount !== null && pdfPageCount > 1) {
                toastUtils.error("Resume spans multiple pages. Reduce the scale so it fits on 1 page.");
                return;
            }
            if (isUnderfilled) {
                toastUtils.error(
                    `Too much blank space (${Math.round((pdfFillRatio ?? 0) * 100)}% filled). ` +
                    `Fill at least ${Math.round(MIN_FILL_RATIO * 100)}% of the page before downloading.`
                );
                return;
            }

            // Check if filename has been changed from original
            if (downloadFilename !== originalFilename && downloadFilename.trim()) {
                setShowFilenameConfirmModal(true);
                return;
            }

            const name = data.personalInfo?.name || "Resume";
            const cleanName = name.replace(/\s+/g, "_");
            const filename = downloadFilename || `${cleanName}_Resume.pdf`;

            // If we have a preview PDF blob, use it directly
            if (previewPdfBlob) {
                await savePdf(previewPdfBlob, filename);
                toastUtils.success("✅ PDF downloaded successfully!");
                if (onDownloadClick) {
                    onDownloadClick();
                }
                return;
            }

            // Otherwise generate new PDF
            setIsGeneratingPDF(true);
            const pdfServerUrl = import.meta.env.VITE_PDF_SERVER_URL || "http://localhost:8000";
            const loadingToast = toastUtils.loading("Making the best optimal PDF... Please wait.");

            let finalSectionOrder = [...sectionOrder];
            if (showPublications && !finalSectionOrder.includes("publications")) {
                finalSectionOrder.push("publications");
            }
            if (!showPublications && finalSectionOrder.includes("publications")) {
                finalSectionOrder = finalSectionOrder.filter(id => id !== "publications");
            }

            // Format data for PDF server
            const pdfPayload = {
                personalInfo: data.personalInfo,
                summary: data.summary || "",
                workExperience: data.workExperience || [],
                projects: data.projects || [],
                leadership: data.leadership || [],
                skills: data.skills || [],
                education: data.education || [],
                publications: data.publications || [],
                checkboxStates: {
                    showSummary: showSummary,
                    showProjects: showProjects,
                    showLeadership: showLeadership,
                    showPublications: showPublications,
                },
                sectionTitles: sectionTitles || {},
                sectionOrder: finalSectionOrder,
                scale: selectedScale,
                overrideAutoScale: overrideAutoScale,
            };

            const response = await fetch(`${pdfServerUrl}/v1/generate-pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pdfPayload),
            });

            if (!response.ok) {
                toastUtils.dismissToast(loadingToast);
                throw new Error(`PDF generation failed: ${response.status}`);
            }

            const pdfBlob = await response.blob();
            await savePdf(pdfBlob, filename);

            toastUtils.dismissToast(loadingToast);
            setShowScaleModal(false);
            setIsGeneratingPDF(false);
            toastUtils.success("✅ PDF downloaded successfully!");
            if (onDownloadClick) {
                onDownloadClick();
            }
        } catch (error: any) {
            console.error("Error generating PDF:", error);
            setIsGeneratingPDF(false);
            toastUtils.error(`Failed to generate PDF: ${error.message}`);
        }
    };

    const handlePrintConfirm = () => {
        setShowWarningModal(false);

        // store original document title and set custom print title
        const originalTitle = document.title;
        document.title = `${data.personalInfo.name || "Resume"}_Resume`;

        // create a print style block (keeps your existing print rules but scoped)
        const printStyle = document.createElement("style");
        printStyle.id = "resume-temp-print-style";
        printStyle.innerHTML = `
      @media print {
        @page { size: letter; margin: 0 0.2in 0.2in 0.2in; }
        html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
        
        body.printing-resume > :not(#temp-resume-print-wrapper) { display: none !important; }
        #temp-resume-print-wrapper { display: block !important; width: 100% !important; }
        #temp-resume-print-wrapper #resume-print-only { display: block !important; visibility: visible !important; }
      }
      /* also hide non-print content while we call window.print on screen to avoid layout jumps */
      body.printing-resume > :not(#temp-resume-print-wrapper) { display: none !important; }
      #temp-resume-print-wrapper { display: block !important; width: 100%; background: white; }
    `;

        document.head.appendChild(printStyle);

        // find the print-only element in the component
        const originalPrintElem = document.getElementById("resume-print-only");
        if (!originalPrintElem) {
            // fallback to calling normal print
            window.print();
            document.title = originalTitle;
            if (document.head.contains(printStyle)) document.head.removeChild(printStyle);
            return;
        }

        // create a temporary wrapper and append a deep clone of the print-only element
        const wrapper = document.createElement("div");
        wrapper.id = "temp-resume-print-wrapper";
        // add the same parent class so scss rules that look for .resume-single-page apply
        wrapper.className = "resume-single-page";
        // clone deeply so event handlers etc. are not needed
        const clone = originalPrintElem.cloneNode(true) as HTMLElement;
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        // add marker class to body so our print style hides everything else
        document.body.classList.add("printing-resume");

        // Small timeout to let DOM and style apply, then print
        setTimeout(() => {
            try {
                window.print();
            } finally {
                // cleanup immediately after printing (give a small delay to avoid cutting off the print job)
                setTimeout(() => {
                    // restore title and remove temporary DOM + style + class
                    document.title = originalTitle;
                    document.body.classList.remove("printing-resume");
                    if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
                    const tmpStyle = document.getElementById("resume-temp-print-style");
                    if (tmpStyle && tmpStyle.parentNode) tmpStyle.parentNode.removeChild(tmpStyle);
                    // remove our printStyle if still present
                    if (document.head.contains(printStyle)) document.head.removeChild(printStyle);
                }, 700);
            }
        }, 120);

        // optional callback
        if (onDownloadClick) onDownloadClick();
    };



    // Explain the download flow with scaling modal
    const showPrintInstructions = () => {
        alert(`How to download your resume:

1. Click "Download Resume" to open the scaling modal.
2. Adjust the scale slider until the page count is correct.
3. Confirm the live preview looks right.
4. Click "Download PDF" to save your resume.

Tip: If the PDF shows extra pages, reduce the scale slightly and try again.`);
    };

    // Calculate content density and determine scaling factor
    useEffect(() => {
        const calculateContentDensity = () => {
            let totalLines = 0;

            // Personal info header (~3-4 lines + space)
            totalLines +=
                (data.personalInfo.name ? 1 : 1) +
                (data.personalInfo.title ? 1 : 1) +
                1 +
                1; // Name, title, contact, space

            // Section titles + space (2 lines each)
            const sections = ["workExperience", "skills", "education"];
            if (showSummary && data.summary?.trim() !== "")
                sections.push("summary");
            if (showProjects && data.projects?.length > 0)
                sections.push("projects");
            if (showLeadership && data.leadership?.length > 0)
                sections.push("leadership");
            if (showPublications && data.publications?.length > 0)
                sections.push("publications");
            totalLines += sections.length * 2;

            // Summary (with wrap estimation)
            if (showSummary && data.summary) {
                totalLines += Math.ceil(data.summary.length / 60);
            } else if (showSummary) {
                totalLines += 1;
            }

            // Work experience
            if (data.workExperience && data.workExperience.length > 0) {
                totalLines += data.workExperience.length;
                data.workExperience.forEach((exp) => {
                    totalLines += 2; // Header ~2 lines
                    exp.responsibilities
                        .filter((r) => r.trim())
                        .forEach((r) => {
                            totalLines += Math.ceil(r.length / 60);
                        });
                });
            }

            // Projects if shown
            if (showProjects && data.projects) {
                data.projects.forEach((proj) => {
                    totalLines += 2;
                    proj.responsibilities
                        .filter((r) => r.trim())
                        .forEach((r) => {
                            totalLines += Math.ceil(r.length / 60);
                        });
                });
            }

            // Leadership if shown
            if (showLeadership && data.leadership) {
                data.leadership.forEach((l) => {
                    const text =
                        l.title + (l.organization ? `, ${l.organization}` : "");
                    totalLines += Math.ceil(text.length / 60);
                });
            }

            // Skills
            if (data.skills && data.skills.length > 0) {
                data.skills.forEach((s) => {
                    const text = `${s.category}: ${s.skills}`;
                    totalLines += Math.ceil(text.length / 60);
                });
            }

            // Education
            if (data.education && data.education.length > 0) {
                data.education.forEach((e) => {
                    const mainText = `${e.institution}${e.location ? `, ${e.location}` : ""
                        } - ${e.degree}${e.field ? `, ${e.field}` : ""}`;
                    totalLines += Math.ceil(mainText.length / 60);
                    if (e.additionalInfo) {
                        totalLines += Math.ceil(e.additionalInfo.length / 60);
                    }
                });
            }

            // Publications if shown
            if (showPublications && data.publications) {
                data.publications.forEach((p) => {
                    totalLines += Math.ceil(p.details.length / 60);
                });
            }

            // No scaling - let content flow naturally across pages
            // This allows multi-page resumes without content cutoff
            return 1.0;
        };

        const newScaling = calculateContentDensity();
        setScalingFactor(newScaling);
    }, [data, showLeadership, showProjects, showSummary, showPublications]);

    // Dynamic styles based on scaling factor
    const getScaledStyles = () => {
        const baseFontSize = 10; // Increased for better readability
        const baseHeaderSize = 16;
        const baseContactSize = 9;

        const fontSize = Math.max(9, Math.round(baseFontSize * scalingFactor));
        const headerSize = Math.max(
            12,
            Math.round(baseHeaderSize * scalingFactor)
        );
        const contactSize = Math.max(
            7,
            Math.round(baseContactSize * scalingFactor)
        );

        const sectionMargin = Math.max(2, Math.round(3 * scalingFactor));
        const itemMargin = Math.max(1, Math.round(2 * scalingFactor));
        const bulletSpacing = Math.max(0.5, Math.round(1 * scalingFactor));

        const lineHeight = Math.max(1.05, 1.15 * scalingFactor);
        const paddingTop = Math.max(0.3, 0.5 * scalingFactor);
        const paddingBottom = Math.max(0.3, 0.5 * scalingFactor);
        const paddingSide = Math.max(0.3, 0.5 * scalingFactor);

        return {
            fontSize: `${fontSize}pt`,
            headerSize: `${headerSize}px`,
            contactSize: `${contactSize}pt`,
            sectionMargin: `${sectionMargin}px`,
            itemMargin: `${itemMargin}px`,
            bulletSpacing: `${bulletSpacing}px`,
            lineHeight: lineHeight.toString(),
            paddingTop: `${paddingTop}in`,
            paddingBottom: `${paddingBottom}in`,
            paddingSide: `${paddingSide}in`,
        };
    };

    const styles = getScaledStyles();

    const formatLinkedIn = (linkedin: string) => {
        if (!linkedin) return "";
        if (linkedin.startsWith("http")) {
            return "LinkedIn";
        }
        return linkedin;
    };

    const formatPortfolio = (portfolio: string) => {
        if (!portfolio) return "";
        if (portfolio.startsWith("http")) {
            return "Portfolio";
        }
        return portfolio;
    };

    const formatGithub = (github: string) => {
        if (!github) return "";
        if (github.startsWith("http")) {
            return "GitHub";
        }
        return github;
    };

    const getLinkedInUrl = (linkedin: string) => {
        if (!linkedin) return "#";
        if (linkedin.startsWith("http")) {
            return linkedin;
        }
        return `https://linkedin.com/in/${linkedin}`;
    };

    const getPortfolioUrl = (portfolio: string) => {
        if (!portfolio) return "#";
        if (portfolio.startsWith("http")) {
            return portfolio;
        }
        return `https://${portfolio}`;
    };

    const formatSkills = (skillsString: string) => {
        if (!skillsString) return "";
        return skillsString.split(",").map((skill) => skill.trim()).join(", ");
    };

    const getGithubUrl = (github: string) => {
        if (!github) return "#";
        if (github.startsWith("http")) {
            return github;
        }
        return `https://github.com/${github}`;
    };

    const formatPublications = (publications: string) => {
        if (!publications) return "";
        if (publications.startsWith("http")) {
            return "Publications";
        }
        return publications;
    };

    const getPublicationsUrl = (publications: string) => {
        if (!publications) return "#";
        if (publications.startsWith("http")) {
            return publications;
        }
        return `https://${publications}`;
    };

    // Function to render sections based on section order
    const renderSection = (sectionId: string) => {
        switch (sectionId) {
            case "summary":
                if (!showSummary) return null;
                return (
                    <div
                        style={{
                            marginBottom: styles.sectionMargin,
                            ...getHighlightStyle("summary"),
                        }}
                    >
                        <div
                            style={{
                                fontSize: styles.fontSize,
                                borderBottom: "1px solid #000",
                                paddingBottom: "2px",
                                marginBottom: styles.itemMargin,
                                fontWeight: "bold",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            SUMMARY
                        </div>
                        <div
                            style={{
                                textAlign: "justify",
                                fontSize: styles.fontSize,
                                lineHeight: styles.lineHeight,
                                letterSpacing: "-0.025em",
                            }}
                        >
                            {renderMarkedText(
                                data.summary ||
                                    "Your professional summary will appear here..."
                            )}
                        </div>
                    </div>
                );

            case "workExperience":
                return (
                    <div
                        style={{
                            marginBottom: styles.sectionMargin,
                            ...getHighlightStyle("workExperience"),
                        }}
                    >
                        <div
                            style={{
                                fontSize: styles.fontSize,
                                borderBottom: "1px solid #000",
                                paddingBottom: "2px",
                                marginBottom: styles.itemMargin,
                                fontWeight: "bold",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            WORK EXPERIENCE
                        </div>
                        {data.workExperience && data.workExperience.length > 0 ? (
                            data.workExperience.map((exp, index) => (
                                <div
                                    key={exp.id}
                                    className="work-experience-item"
                                    style={{
                                        marginBottom:
                                            index === data.workExperience.length - 1
                                                ? styles.bulletSpacing
                                                : styles.itemMargin,
                                    }}
                                >
                                    {/* Header with left/right alignment */}
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            marginBottom: styles.bulletSpacing,
                                        }}
                                    >
                                        {/* Left side */}
                                        <div style={{ flex: "1" }}>
                                            {exp.company && (
                                                <div
                                                    style={{
                                                        fontSize: styles.fontSize,
                                                        fontWeight: "bold",
                                                        letterSpacing: "-0.025em",
                                                        lineHeight: styles.lineHeight,
                                                    }}
                                                >
                                                    {exp.company}
                                                </div>
                                            )}
                                            <div
                                                style={{
                                                    fontSize: styles.fontSize,
                                                    letterSpacing: "-0.025em",
                                                    lineHeight: styles.lineHeight,
                                                }}
                                            >
                                                {renderMarkedText(exp.position)}
                                                {exp.roleType &&
                                                    exp.roleType !== "None" &&
                                                    ` – ${exp.roleType}`}
                                            </div>
                                        </div>

                                        {/* Right side */}
                                        <div
                                            style={{
                                                textAlign: "right",
                                                marginLeft: "20px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: styles.fontSize,
                                                    letterSpacing: "-0.025em",
                                                    lineHeight: styles.lineHeight,
                                                }}
                                            >
                                                {exp.location}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: styles.fontSize,
                                                    letterSpacing: "-0.025em",
                                                    lineHeight: styles.lineHeight,
                                                }}
                                            >
                                                {exp.duration}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Responsibilities */}
                                    {exp.responsibilities.map(
                                        (resp, respIndex) =>
                                            resp.trim() && (
                                                <div
                                                    key={respIndex}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        marginBottom:
                                                            styles.bulletSpacing,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: styles.fontSize,
                                                            marginRight: "4px",
                                                            minWidth: "8px",
                                                        }}
                                                    >
                                                        •
                                                    </span>
                                                    <div
                                                        style={{
                                                            textAlign: "justify",
                                                            fontSize: styles.fontSize,
                                                            lineHeight:
                                                                styles.lineHeight,
                                                            letterSpacing: "-0.025em",
                                                        }}
                                                    >
                                                        {renderMarkedText(resp)}
                                                    </div>
                                                </div>
                                            )
                                    )}
                                </div>
                            ))
                        ) : (
                            <div
                                style={{
                                    fontSize: styles.fontSize,
                                    fontStyle: "italic",
                                    color: "#666",
                                    letterSpacing: "-0.025em",
                                }}
                            >
                                Your work experience will appear here...
                            </div>
                        )}
                    </div>
                );

            case "projects":
                if (!showProjects || !data.projects || data.projects.length === 0) return null;
                return (
                    <div
                        style={{
                            marginBottom: styles.sectionMargin,
                            ...getHighlightStyle("projects"),
                        }}
                    >
                        <div
                            style={{
                                fontSize: styles.fontSize,
                                borderBottom: "1px solid #000",
                                paddingBottom: "2px",
                                marginBottom: styles.itemMargin,
                                fontWeight: "bold",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            PROJECTS
                        </div>
                        {data.projects.map((project, index) => (
                            <div
                                key={project.id}
                                className="project-item"
                                style={{
                                    marginBottom:
                                        index === data.projects.length - 1
                                            ? styles.bulletSpacing
                                            : styles.itemMargin,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        marginBottom: styles.bulletSpacing,
                                    }}
                                >
                                    {/* Left side */}
                                    <div style={{ flex: "1" }}>
                                        {project.company && (
                                            <div
                                                style={{
                                                    fontSize: styles.fontSize,
                                                    fontWeight: "bold",
                                                    letterSpacing: "-0.025em",
                                                    lineHeight: styles.lineHeight,
                                                }}
                                            >
                                                {project.company}
                                            </div>
                                        )}
                                        <div
                                            style={{
                                                fontSize: styles.fontSize,
                                                fontWeight: "700 !important",
                                                letterSpacing: "-0.025em",
                                                lineHeight: styles.lineHeight,
                                                color: "#000",
                                                fontStyle: "normal",
                                            }}
                                        >
                                            <strong>{project.position}</strong>
                                            {project.roleType &&
                                                project.roleType !== "None" &&
                                                ` – ${project.roleType}`}
                                            {project.linkName &&
                                                project.linkUrl && (
                                                    <>
                                                        {" - "}
                                                        <a
                                                            href={project.linkUrl}
                                                            style={{
                                                                color: "blue",
                                                                textDecoration:
                                                                    "none",
                                                            }}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {project.linkName}
                                                        </a>
                                                    </>
                                                )}
                                        </div>
                                    </div>

                                    {/* Right side */}
                                    <div
                                        style={{
                                            textAlign: "right",
                                            marginLeft: "20px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: styles.fontSize,
                                                letterSpacing: "-0.025em",
                                                lineHeight: styles.lineHeight,
                                            }}
                                        >
                                            {project.location}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: styles.fontSize,
                                                letterSpacing: "-0.025em",
                                                lineHeight: styles.lineHeight,
                                            }}
                                        >
                                            {project.duration}
                                        </div>
                                    </div>
                                </div>
                                {project.responsibilities.map(
                                    (resp, respIndex) =>
                                        resp.trim() && (
                                            <div
                                                key={respIndex}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    marginBottom:
                                                        styles.bulletSpacing,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: styles.fontSize,
                                                        marginRight: "4px",
                                                        minWidth: "8px",
                                                    }}
                                                >
                                                    •
                                                </span>
                                                <div
                                                    style={{
                                                        textAlign: "justify",
                                                        fontSize: styles.fontSize,
                                                        lineHeight:
                                                            styles.lineHeight,
                                                        letterSpacing: "-0.025em",
                                                    }}
                                                >
                                                    {renderMarkedText(resp)}
                                                </div>
                                            </div>
                                        )
                                )}
                            </div>
                        ))}
                    </div>
                );

            case "leadership":
                if (!showLeadership || !data.leadership || data.leadership.length === 0) return null;
                return (
                    <div
                        style={{
                            marginBottom: styles.sectionMargin,
                            ...getHighlightStyle("leadership"),
                        }}
                    >
                        <div
                            style={{
                                fontSize: styles.fontSize,
                                borderBottom: "1px solid #000",
                                paddingBottom: "2px",
                                marginBottom: styles.itemMargin,
                                fontWeight: "bold",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            {headingFor("leadership", "Leadership & Volunteering")}
                        </div>
                        {data.leadership.map((item, index) => (
                            <div
                                key={item.id}
                                className="leadership-item"
                                style={{
                                    marginBottom:
                                        index === data.leadership.length - 1
                                            ? styles.bulletSpacing
                                            : styles.itemMargin,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: styles.fontSize,
                                        fontWeight: "bold",
                                        letterSpacing: "-0.025em",
                                        lineHeight: styles.lineHeight,
                                        marginBottom: styles.bulletSpacing,
                                    }}
                                >
                                    {renderMarkedText(item.title)}
                                </div>
                                {item.organization &&
                                    item.organization
                                        .split(/\r?\n/)
                                        .filter((line) => line.trim())
                                        .map((line, lineIndex) => (
                                            <div
                                                key={lineIndex}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    marginBottom:
                                                        styles.bulletSpacing,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: styles.fontSize,
                                                        marginRight: "4px",
                                                        minWidth: "8px",
                                                    }}
                                                >
                                                    •
                                                </span>
                                                <div
                                                    style={{
                                                        textAlign: "justify",
                                                        fontSize: styles.fontSize,
                                                        lineHeight:
                                                            styles.lineHeight,
                                                        letterSpacing:
                                                            "-0.025em",
                                                    }}
                                                >
                                                    {renderMarkedText(
                                                        line.trim()
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                            </div>
                        ))}
                    </div>
                );

            case "skills":
                const skillsFontSize = Math.max(11, Math.round(13 * scalingFactor)) + "px";
                return (
                    <div
                        style={{
                            marginBottom: styles.sectionMargin,
                            ...getHighlightStyle("skills"),
                        }}
                    >
                        <div
                            style={{
                                fontSize: styles.fontSize,
                                borderBottom: "1px solid #000",
                                paddingBottom: "2px",
                                marginBottom: styles.itemMargin,
                                fontWeight: "bold",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            SKILLS
                        </div>
                        {data.skills && data.skills.length > 0 ? (
                            data.skills.map((category) => (
                                <div
                                    key={category.id}
                                    style={{
                                        fontSize: skillsFontSize,
                                        marginBottom: styles.bulletSpacing,
                                        lineHeight: styles.lineHeight,
                                        letterSpacing: "-0.025em",
                                        display: "flex",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: "150px",
                                            flexShrink: 0,
                                            fontWeight: "bold",
                                            letterSpacing: "-0.025em",
                                        }}
                                    >
                                        {category.category}
                                    </span>
                                    <span
                                        style={{
                                            fontWeight: "bold",
                                            margin: "0 3px",
                                        }}
                                    >
                                        :
                                    </span>
                                    <span
                                        style={{
                                            flex: "1",
                                            wordWrap: "break-word",
                                            textAlign: "justify",
                                        }}
                                    >
                                        {renderMarkedText(
                                            formatSkills(category.skills)
                                        )}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div
                                style={{
                                    fontSize: skillsFontSize,
                                    fontStyle: "italic",
                                    color: "#666",
                                    letterSpacing: "-0.025em",
                                }}
                            >
                                Your skills will appear here...
                            </div>
                        )}
                    </div>
                );

            case "education":
                return (
                    <div
                        className="education-section"
                        style={{
                            marginBottom: "0px",
                            ...getHighlightStyle("education"),
                        }}
                    >
                        <div
                            style={{
                                fontSize: styles.fontSize,
                                borderBottom: "1px solid #000",
                                paddingBottom: "2px",
                                marginBottom: styles.itemMargin,
                                fontWeight: "bold",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            EDUCATION
                        </div>
                        <div>
                            {data.education && data.education.length > 0 ? (
                                data.education.map((edu, index) => (
                                    <div
                                        key={edu.id}
                                        className="education-item"
                                        style={{
                                            marginBottom:
                                                index === data.education.length - 1
                                                    ? "0px"
                                                    : styles.itemMargin,
                                        }}
                                    >
                                        {/* Header with left/right alignment */}
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                marginBottom: styles.bulletSpacing,
                                            }}
                                        >
                                            {/* Left side */}
                                            <div style={{ flex: "1" }}>
                                                <div
                                                    style={{
                                                        fontSize: styles.fontSize,
                                                        fontWeight: "bold",
                                                        letterSpacing: "-0.025em",
                                                        lineHeight: styles.lineHeight,
                                                    }}
                                                >
                                                    {edu.institution}
                                                    {edu.location &&
                                                        `, ${edu.location}`}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: styles.fontSize,
                                                        letterSpacing: "-0.025em",
                                                        lineHeight: styles.lineHeight,
                                                    }}
                                                >
                                                    {edu.degree}
                                                    {edu.field && `, ${edu.field}`}
                                                </div>
                                            </div>

                                            {/* Right side */}
                                            <div
                                                style={{
                                                    textAlign: "right",
                                                    marginLeft: "20px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: styles.fontSize,
                                                        letterSpacing: "-0.025em",
                                                        lineHeight: styles.lineHeight,
                                                    }}
                                                >
                                                    {edu.duration}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        {edu.additionalInfo && (
                                            <div
                                                style={{
                                                    fontSize: styles.fontSize,
                                                    letterSpacing: "-0.025em",
                                                    lineHeight: styles.lineHeight,
                                                }}
                                            >
                                                {renderMarkedText(
                                                    edu.additionalInfo
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div
                                    style={{
                                        fontSize: styles.fontSize,
                                        fontStyle: "italic",
                                        color: "#666",
                                        letterSpacing: "-0.025em",
                                    }}
                                >
                                    Your education will appear here...
                                </div>
                            )}
                        </div>
                    </div>
                );

            case "publications":
                if (!showPublications) return null;

                const hasPublications = data.publications &&
                    data.publications.length > 0 &&
                    data.publications.some(pub => pub.details && pub.details.trim() !== "");

                return (
                    <div style={{ marginBottom: styles.sectionMargin }}>
                        <div
                            style={{
                                fontSize: styles.fontSize,
                                borderBottom: "1px solid #000",
                                paddingBottom: "2px",
                                marginBottom: styles.itemMargin,
                                fontWeight: "bold",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            PUBLICATIONS
                        </div>
                        {hasPublications ? (
                            data.publications
                                .filter(pub => pub.details && pub.details.trim() !== "")
                                .map((publication) => (
                                    <div
                                        key={publication.id}
                                        style={{ marginBottom: styles.bulletSpacing }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: styles.fontSize,
                                                    marginRight: "4px",
                                                    minWidth: "8px",
                                                }}
                                            >
                                                •
                                            </span>
                                            <div
                                                style={{
                                                    fontSize: styles.fontSize,
                                                    lineHeight: styles.lineHeight,
                                                    textAlign: "justify",
                                                    flex: "1",
                                                    letterSpacing: "-0.025em",
                                                }}
                                            >
                                                {renderMarkedText(publication.details)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                        ) : (
                            <div
                                style={{
                                    fontSize: styles.fontSize,
                                    fontStyle: "italic",
                                    color: "#666",
                                    lineHeight: styles.lineHeight,
                                    letterSpacing: "-0.025em",
                                }}
                            >
                                Your publications will appear here...
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    // Helper function to get highlight style if field is changed
    const getHighlightStyle = (fieldPath: string) => {
        // Removed background color highlighting - now returns empty object
        return {};
    };

    const resumeContent = (
        <>
            {/* Header - Always first */}
            <div
                style={{
                    textAlign: "center",
                    marginBottom: styles.sectionMargin,
                    ...getHighlightStyle("personalInfo"),
                }}
            >
                <div
                    style={{
                        fontSize: styles.headerSize,
                        marginBottom: "2px",
                        fontWeight: "bold",
                        letterSpacing: "-0.025em",
                    }}
                >
                    {data.personalInfo.name || "Your Name"}
                </div>
                {data.personalInfo.title &&
                    data.personalInfo.title.trim() !== "" && (
                        <div
                            style={{
                                fontSize: styles.contactSize,
                                marginBottom: "2px",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            {data.personalInfo.title}
                        </div>
                    )}
                <div
                    style={{
                        fontSize: styles.contactSize,
                        letterSpacing: "-0.025em",
                    }}
                >
                    {data.personalInfo.phone}
                    {data.personalInfo.email && (
                        <>
                            {" | "}
                            <a
                                href={`mailto:${data.personalInfo.email}`}
                                style={{
                                    color: "blue",
                                    textDecoration: "none",
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {data.personalInfo.email}
                            </a>
                        </>
                    )}
                    {data.personalInfo.location && (
                        <>
                            {" | "}
                            {data.personalInfo.location}
                        </>
                    )}
                    {data.personalInfo.linkedin && (
                        <>
                            {" | "}
                            <a
                                href={getLinkedInUrl(
                                    data.personalInfo.linkedin
                                )}
                                style={{
                                    color: "blue",
                                    textDecoration: "none",
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {formatLinkedIn(data.personalInfo.linkedin)}
                            </a>
                        </>
                    )}
                    {data.personalInfo.portfolio && (
                        <>
                            {" | "}
                            <a
                                href={getPortfolioUrl(
                                    data.personalInfo.portfolio
                                )}
                                style={{
                                    color: "blue",
                                    textDecoration: "none",
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {formatPortfolio(data.personalInfo.portfolio)}
                            </a>
                        </>
                    )}
                    {data.personalInfo.github && (
                        <>
                            {" | "}
                            <a
                                href={getGithubUrl(data.personalInfo.github)}
                                style={{
                                    color: "blue",
                                    textDecoration: "none",
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {formatGithub(data.personalInfo.github)}
                            </a>
                        </>
                    )}
                    {data.personalInfo.publications && (
                        <>
                            {" | "}
                            <a
                                href={getPublicationsUrl(
                                    data.personalInfo.publications
                                )}
                                style={{
                                    color: "blue",
                                    textDecoration: "none",
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {formatPublications(data.personalInfo.publications)}
                            </a>
                        </>
                    )}
                    {(data.personalInfo.profileLinks ?? []).filter((l) => l.label?.trim() && l.url?.trim()).map((link) => (
                        <React.Fragment key={link.id}>
                            {" | "}
                            <a
                                href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                                style={{
                                    color: "blue",
                                    textDecoration: "none",
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {link.label.trim()}
                            </a>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Render sections based on section order; include publications only when enabled */}
            {(() => {
                const order = sectionOrder.filter(sectionId => sectionId !== "personalInfo");
                if (showPublications && !order.includes("publications")) {
                    order.push("publications");
                }
                if (!showPublications && order.includes("publications")) {
                    order.splice(order.indexOf("publications"), 1);
                }
                // Wrap every rendered section in a div with a small marginTop
                // so the section heading gets breathing room from the previous
                // section's last line (skip the first to avoid pushing it down
                // below the contact block). Tunable via `styles.sectionMargin`.
                // Small fixed gap between sections — user-requested. Sits on
                // top of each section header so the previous section's last
                // line has breathing room. First section gets 0 to keep it
                // tight against the contact block.
                return order.map((sectionId, idx) => (
                    <div
                        key={sectionId}
                        style={{ marginTop: idx === 0 ? 0 : "8px" }}
                    >
                        {renderSection(sectionId)}
                    </div>
                ));
            })()}
        </>
    );

    // Helper function to perform the actual download
    const performDownload = async () => {
        try {
            const name = data.personalInfo?.name || "Resume";
            const cleanName = name.replace(/\s+/g, "_");
            const filename = downloadFilename || `${cleanName}_Resume.pdf`;

            // If we have a preview PDF blob, use it directly
            if (previewPdfBlob) {
                await savePdf(previewPdfBlob, filename);
                toastUtils.success("✅ PDF downloaded successfully!");
                if (onDownloadClick) {
                    onDownloadClick();
                }
                return;
            }

            // Otherwise generate new PDF
            setIsGeneratingPDF(true);
            const pdfServerUrl = import.meta.env.VITE_PDF_SERVER_URL || "http://localhost:8000";
            const loadingToast = toastUtils.loading("Making the best optimal PDF... Please wait.");

            let finalSectionOrderForDownload = [...sectionOrder];
            if (showPublications && !finalSectionOrderForDownload.includes("publications")) {
                finalSectionOrderForDownload.push("publications");
            }
            if (!showPublications && finalSectionOrderForDownload.includes("publications")) {
                finalSectionOrderForDownload = finalSectionOrderForDownload.filter(id => id !== "publications");
            }

            const pdfPayload = {
                personalInfo: data.personalInfo,
                summary: data.summary || "",
                workExperience: data.workExperience || [],
                projects: data.projects || [],
                leadership: data.leadership || [],
                skills: data.skills || [],
                education: data.education || [],
                publications: data.publications || [],
                checkboxStates: {
                    showSummary: showSummary,
                    showProjects: showProjects,
                    showLeadership: showLeadership,
                    showPublications: showPublications,
                },
                sectionTitles: sectionTitles || {},
                sectionOrder: finalSectionOrderForDownload,
                styles: styles,
                overrideAutoScale: overrideAutoScale,
                selectedScale: selectedScale,
            };

            const response = await fetch(`${pdfServerUrl}/v1/generate-pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pdfPayload),
            });

            if (!response.ok) {
                throw new Error(`PDF generation failed: ${response.status}`);
            }

            const pdfBlob = await response.blob();
            await savePdf(pdfBlob, filename);

            toastUtils.dismissToast(loadingToast);
            toastUtils.success("✅ PDF downloaded successfully!");
            if (onDownloadClick) {
                onDownloadClick();
            }
        } catch (error: any) {
            console.error("Download failed:", error);
            toastUtils.error(`Failed to download PDF: ${error.message}`);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return (
        <div className="resume-single-page">
            {/* Warning Modal */}
            {showWarningModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.48)",
                        backdropFilter: "blur(2px)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 2100,
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "white",
                            padding: "2rem",
                            borderRadius: "12px",
                            boxShadow:
                                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                            maxWidth: "500px",
                            width: "90%",
                            textAlign: "center",
                            border: "3px solid #2563eb",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                color: "#dc2626",
                                marginBottom: "1rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.5rem",
                            }}
                        >
                            ⚠️ AUTOMATIC PRINT SETTINGS ⚠️
                        </div>

                        <div
                            style={{
                                fontSize: "1rem",
                                lineHeight: "1.6",
                                color: "#374151",
                                marginBottom: "1.5rem",
                                textAlign: "left",
                            }}
                        >
                            <div style={{ marginBottom: "0.75rem" }}>
                                <strong>
                                    Pages:{" "}
                                    <span
                                        style={{
                                            color: "#10b981",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        AUTO-SET TO 2
                                    </span>
                                </strong>{" "}
                                — automatically configured.
                            </div>
                            <div style={{ marginBottom: "0.75rem" }}>
                                <strong>
                                    Scale:{" "}
                                    <span
                                        style={{
                                            color: "#10b981",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        AUTO-OPTIMIZED
                                    </span>
                                </strong>{" "}
                                — for best fit.
                            </div>
                            <div style={{ marginBottom: "0.75rem" }}>
                                <strong>
                                    Margins:{" "}
                                    <span
                                        style={{
                                            color: "#10b981",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        AUTO-SET TO MINIMAL
                                    </span>
                                </strong>{" "}
                                — maximum content space.
                            </div>
                        </div>

                        <div
                            style={{
                                fontSize: "0.9rem",
                                color: "#6b7280",
                                marginBottom: "1.5rem",
                                fontStyle: "italic",
                            }}
                        >
                            The print dialog will open with optimized settings. Just click "Print" or "Save as PDF"!
                        </div>

                        <button
                            onClick={handlePrintConfirm}
                            style={{
                                backgroundColor: "#10b981",

                                color: "white",
                                padding: "12px 24px",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "1rem",
                                fontWeight: "bold",
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    "#059669";
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    "#10b981";
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {showPrintButtons && (
                <div
                    className="no-print"
                    style={{
                        marginBottom: "1rem",
                        textAlign: "center",
                        display: "flex",
                        gap: "10px",
                        justifyContent: "center",
                    }}
                >
                    <button
                        onClick={() => setShowScaleModal(true)}
                        disabled={isGeneratingPDF}
                        style={{
                            backgroundColor: isGeneratingPDF ? "#9ca3af" : "#10b981",
                            color: "white",
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: "6px",
                            cursor: isGeneratingPDF ? "not-allowed" : "pointer",
                            fontWeight: "600",
                            fontSize: "14px",
                            transition: "background-color 0.2s",
                        }}
                    >
                        {isGeneratingPDF ? "Generating PDF..." : "Download Resume"}
                    </button>
                    {/* <button
                        onClick={handleCopyJsonWithStyles}
                        style={{
                            backgroundColor: "#3b82f6",
                            color: "white",
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "14px",
                            transition: "background-color 0.2s",
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = "#2563eb";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = "#3b82f6";
                        }}
                    >
                        Copy JSON with Styles
                    </button> */}
                </div>
            )}

            {/* Print Control Buttons - Add these to your UI */}
            {showPrintButtons && (
                <div
                    className="no-print"
                    style={{ marginBottom: "1rem", textAlign: "center" }}
                >
                    {/* <button
                        onClick={() => setShowScalingModal(true)}
                        style={{
                            backgroundColor: "#10b981",
                            color: "white",
                            padding: "8px 16px",
                            border: "none",
                            borderRadius: "4px",
                            marginRight: "8px",
                            cursor: "pointer",
                            fontWeight: "600",
                        }}
                    >
                        In-House Scaling
                    </button> */}
                    {/* "Download PDF" toolbar button — only shown on /optimize routes,
                        hidden in the portal (of no use there). */}
                    {showDirectPdfButton && isOptimizeRoute && (
                        <button
                            onClick={handlePrint}
                            style={{
                                backgroundColor: "#3b82f6",
                                color: "white",
                                padding: "8px 16px",
                                border: "none",
                                borderRadius: "4px",
                                marginRight: "8px",
                                cursor: "pointer",
                            }}
                        >
                            Download PDF
                        </button>
                    )}
                    <button
                        onClick={showPrintInstructions}
                        style={{
                            backgroundColor: "#6b7280",
                            color: "white",
                            padding: "8px 16px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Print Instructions
                    </button>
                </div>
            )}

            {/* Scale Selection Modal */}
            {showScaleModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 2100,
                        padding: "20px",
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "white",
                            borderRadius: "16px",
                            boxShadow: "0 32px 48px -20px rgba(15, 23, 42, 0.4)",
                            border: "1px solid #e5e7eb",
                            maxWidth: "1180px",
                            width: "100%",
                            maxHeight: "90vh",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            fontFamily: "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: "1.25rem 1.5rem",
                            borderBottom: "1px solid #e5e7eb",
                            background: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "1rem",
                        }}>
                            <div>
                                <h2
                                    style={{
                                        fontSize: "1.45rem",
                                        fontWeight: "700",
                                        marginBottom: "0.35rem",
                                        color: "#111827",
                                    }}
                                >
                                    Select PDF Scale
                                </h2>
                                <p
                                    style={{
                                        fontSize: "0.9rem",
                                        color: "#6b7280",
                                    }}
                                >
                                    Fine-tune scale and confirm one-page output in live preview.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowScaleModal(false);
                                    setPdfPageCount(null);
                                    setPdfFillRatio(null);
                                }}
                                disabled={isGeneratingPDF}
                                style={{
                                    width: "34px",
                                    height: "34px",
                                    borderRadius: "999px",
                                    border: "1px solid #e5e7eb",
                                    backgroundColor: "#f8fafc",
                                    color: "#64748b",
                                    fontSize: "1.2rem",
                                    fontWeight: "600",
                                    lineHeight: 1,
                                    cursor: isGeneratingPDF ? "not-allowed" : "pointer",
                                    opacity: isGeneratingPDF ? 0.6 : 1,
                                }}
                                aria-label="Close PDF scale modal"
                            >
                                ×
                            </button>
                        </div>

                        {/* Content Area - Side by Side */}
                        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                            {/* Left Side - Controls */}
                            <div style={{
                                width: "360px",
                                padding: "1.25rem",
                                borderRight: "1px solid #e5e7eb",
                                display: "flex",
                                flexDirection: "column",
                                overflowY: "auto",
                                backgroundColor: "#fcfcfd",
                            }}>
                                <div style={{ marginBottom: "1.5rem" }}>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.9rem",
                                            fontWeight: "600",
                                            marginBottom: "0.75rem",
                                            color: "#374151",
                                        }}
                                    >
                                        Scale: <span style={{ color: "#000000", fontSize: "1.1rem", fontWeight: "700" }}>{(selectedScale * 100).toFixed(0)}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="1.5"
                                        step="0.01"
                                        value={selectedScale}
                                        onChange={(e) => {
                                            const newScale = parseFloat(e.target.value);
                                            setSelectedScale(newScale);
                                            // Save to localStorage
                                            localStorage.setItem('resumePreview_lastScale', newScale.toString());
                                        }}
                                        style={{
                                            width: "100%",
                                            height: "10px",
                                            borderRadius: "5px",
                                            outline: "none",
                                            cursor: "pointer",
                                            background: `linear-gradient(to right, #000000 0%, #000000 ${((selectedScale - 0.5) / 1.0) * 100}%, #e5e7eb ${((selectedScale - 0.5) / 1.0) * 100}%, #e5e7eb 100%)`,
                                            accentColor: "#000000",
                                        }}
                                    />
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            fontSize: "0.75rem",
                                            color: "#9ca3af",
                                            marginTop: "0.5rem",
                                        }}
                                    >
                                        <span>50%</span>
                                        <span>75%</span>
                                        <span>100%</span>
                                        <span>125%</span>
                                        <span>150%</span>
                                    </div>

                                    {/* Number Input with +/- Buttons */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "1rem" }}>
                                        <button
                                            onClick={() => {
                                                const newScale = Math.max(0.5, selectedScale - 0.01);
                                                setSelectedScale(newScale);
                                                localStorage.setItem('resumePreview_lastScale', newScale.toString());
                                            }}
                                            style={{
                                                padding: "8px 12px",
                                                backgroundColor: "#10b981",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                                fontSize: "1rem",
                                            }}
                                        >-</button>
                                        <input
                                            type="number"
                                            min="50"
                                            max="150"
                                            step="1"
                                            value={Math.round(selectedScale * 100)}
                                            onChange={(e) => {
                                                const val = Math.min(150, Math.max(50, Number(e.target.value)));
                                                const newScale = val / 100;
                                                setSelectedScale(newScale);
                                                localStorage.setItem('resumePreview_lastScale', newScale.toString());
                                            }}
                                            style={{
                                                width: "80px",
                                                padding: "8px",
                                                textAlign: "center",
                                                border: "2px solid #6ee7b7",
                                                borderRadius: "6px",
                                                fontSize: "1rem",
                                                fontWeight: "600",
                                            }}
                                        />
                                        <span style={{ fontWeight: "600", color: "#374151" }}>%</span>
                                        <button
                                            onClick={() => {
                                                const newScale = Math.min(1.5, selectedScale + 0.01);
                                                setSelectedScale(newScale);
                                                localStorage.setItem('resumePreview_lastScale', newScale.toString());
                                            }}
                                            style={{
                                                padding: "8px 12px",
                                                backgroundColor: "#10b981",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                                fontSize: "1rem",
                                            }}
                                        >+</button>
                                    </div>
                                </div>

                                <div style={{
                                    marginBottom: "1.5rem",
                                    padding: "1rem",
                                    backgroundColor: "#ffffff",
                                    borderRadius: "10px",
                                    border: "1px solid #e5e7eb"
                                }}>
                                    <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: "1.5" }}>
                                        <strong style={{ color: "#334155" }}>Adjust scale to control final PDF length.</strong>
                                        <br />
                                        <span style={{ color: "#64748b", marginTop: "0.5rem", display: "block" }}>
                                            For best recruiter readability, keep preview at 1 page before downloading.
                                        </span>
                                    </div>
                                </div>

                                {/* Page Count Warning */}
                                {pdfPageCount !== null && pdfPageCount > 1 && (
                                    <div style={{
                                        marginBottom: "1rem",
                                        padding: "1rem",
                                        backgroundColor: "#fef3c7",
                                        borderRadius: "8px",
                                        border: "2px solid #f59e0b"
                                    }}>
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            marginBottom: "0.5rem"
                                        }}>
                                            <span style={{ fontSize: "1.25rem" }}>⚠️</span>
                                            <strong style={{ color: "#92400e", fontSize: "0.9rem" }}>
                                                Resume currently spans {pdfPageCount} pages
                                            </strong>
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "#78350f", lineHeight: "1.5" }}>
                                            Try reducing scale slightly so resume fits in 1 page before download.
                                        </div>
                                    </div>
                                )}

                                {/* Underfilled (too much blank space) Warning */}
                                {isUnderfilled && (
                                    <div style={{
                                        marginBottom: "1rem",
                                        padding: "1rem",
                                        backgroundColor: "#fef3c7",
                                        borderRadius: "8px",
                                        border: "2px solid #f59e0b"
                                    }}>
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            marginBottom: "0.5rem"
                                        }}>
                                            <span style={{ fontSize: "1.25rem" }}>⚠️</span>
                                            <strong style={{ color: "#92400e", fontSize: "0.9rem" }}>
                                                Too much blank space ({Math.round((pdfFillRatio ?? 0) * 100)}% filled)
                                            </strong>
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "#78350f", lineHeight: "1.5" }}>
                                            The page must be at least {Math.round(MIN_FILL_RATIO * 100)}% full before download.
                                            Increase the scale or add more content so the resume fills the page.
                                        </div>
                                    </div>
                                )}

                                {/* Page Count Success */}
                                {isPageCountValid && (
                                    <div style={{
                                        marginBottom: "1rem",
                                        padding: "1rem",
                                        backgroundColor: "#ecfdf5",
                                        borderRadius: "8px",
                                        border: "2px solid #10b981"
                                    }}>
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem"
                                        }}>
                                            <span style={{ fontSize: "1.25rem" }}>✅</span>
                                            <strong style={{ color: "#059669", fontSize: "0.9rem" }}>
                                                Your resume looks good{pdfFillRatio !== null ? ` (${Math.round(pdfFillRatio * 100)}% filled)` : ""}. Ready to download.
                                            </strong>
                                        </div>
                                    </div>
                                )}

                                {/* Filename Display */}
                                <div style={{
                                    marginBottom: "1rem",
                                    padding: "0.75rem 1rem",
                                    backgroundColor: "#ffffff",
                                    borderRadius: "8px",
                                    border: "1px solid #e5e7eb"
                                }}>
                                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                                        Download as:
                                    </div>
                                    <input
                                        type="text"
                                        value={downloadFilename}
                                        onChange={(e) => setDownloadFilename(e.target.value)}
                                        style={{
                                            fontSize: "0.9rem",
                                            fontWeight: "600",
                                            color: "#1f2937",
                                            width: "100%",
                                            padding: "0.25rem 0",
                                            border: "none",
                                            background: "transparent",
                                            borderBottom: "1px solid #d1d5db",
                                            outline: "none"
                                        }}
                                        placeholder="Enter filename..."
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: "flex", gap: "0.75rem", marginTop: "auto", paddingTop: "1rem" }}>
                                    <button
                                        onClick={() => {
                                            setShowScaleModal(false);
                                            setPdfPageCount(null);
                                        }}
                                        disabled={isGeneratingPDF}
                                        style={{
                                            flex: 1,
                                            backgroundColor: "#eef2f7",
                                            color: "#475569",
                                            padding: "10px 24px",
                                            border: "1px solid #dbe3ef",
                                            borderRadius: "8px",
                                            fontSize: "1rem",
                                            fontWeight: "600",
                                            cursor: isGeneratingPDF ? "not-allowed" : "pointer",
                                            opacity: isGeneratingPDF ? 0.5 : 1,
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDownloadResume}
                                        disabled={isDownloadBlocked}
                                        style={{
                                            flex: 1,
                                            background: isDownloadBlocked
                                                ? "#9ca3af"
                                                : "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                                            color: "white",
                                            padding: "10px 24px",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontSize: "1rem",
                                            fontWeight: "600",
                                            cursor: isDownloadBlocked ? "not-allowed" : "pointer",
                                            boxShadow: isDownloadBlocked
                                                ? "none"
                                                : "0 6px 18px rgba(16, 185, 129, 0.35)",
                                            transition: "all 0.2s",
                                        }}
                                    >
                                        {isGeneratingPDF
                                            ? "Generating..."
                                            : (pdfPageCount !== null && pdfPageCount > 1)
                                                ? `Showing ${pdfPageCount} pages - reduce scale`
                                                : isUnderfilled
                                                    ? "Fill the page to download"
                                                    : previewPdfBlob
                                                        ? "Download PDF"
                                                        : "Generate Preview First"}
                                    </button>
                                </div>
                            </div>

                            {/* Right Side - PDF Preview */}
                            <div style={{
                                flex: 1,
                                padding: "1.5rem",
                                backgroundColor: "#f3f6fb",
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                                minHeight: 0,
                            }}>
                                <div style={{
                                    marginBottom: "0.75rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "0.75rem",
                                }}>
                                    <div style={{
                                        fontSize: "0.875rem",
                                        color: "#475569",
                                        fontWeight: "600",
                                    }}>
                                        Live PDF Preview
                                    </div>
                                    <div style={{
                                        fontSize: "0.75rem",
                                        fontWeight: "600",
                                        color: "#059669",
                                        backgroundColor: "#ecfdf5",
                                        border: "1px solid #10b981",
                                        borderRadius: "999px",
                                        padding: "0.25rem 0.6rem",
                                    }}>
                                        {pdfPageCount !== null ? `${pdfPageCount} page${pdfPageCount > 1 ? "s" : ""}` : "Analyzing pages..."}
                                    </div>
                                </div>

                                {isGeneratingPreview ? (
                                    <div style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: "white",
                                        borderRadius: "10px",
                                        border: "1px solid #e5e7eb",
                                        padding: "2rem",
                                    }}>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{
                                                width: "50px",
                                                height: "50px",
                                                border: "4px solid #e5e7eb",
                                                borderTop: "4px solid #2563eb",
                                                borderRadius: "50%",
                                                animation: "spin 1s linear infinite",
                                                margin: "0 auto 1.5rem",
                                            }}></div>
                                            <div style={{
                                                color: "#374151",
                                                fontSize: "1rem",
                                                fontWeight: "600",
                                                marginBottom: "0.5rem",
                                            }}>
                                                {loadingMessages[loadingMessageIndex]}
                                            </div>
                                            <div style={{
                                                color: "#9ca3af",
                                                fontSize: "0.85rem",
                                                fontStyle: "italic",
                                            }}>
                                                Please wait while we create your perfect resume...
                                            </div>
                                        </div>
                                    </div>
                                ) : previewPdfUrl ? (
                                    <div style={{
                                        flex: 1,
                                        backgroundColor: "#525252",
                                        borderRadius: "8px",
                                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                        overflow: "hidden",
                                        display: "flex",
                                        flexDirection: "column",
                                        minHeight: 0,
                                    }}>
                                        {/* PDF Viewer - Full scrollable viewer */}
                                        <iframe
                                            src={`${previewPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                border: "none",
                                                flex: 1,
                                                minHeight: 0,
                                            }}
                                            title="PDF Preview"
                                        />
                                    </div>
                                ) : (
                                    <div style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: "white",
                                        borderRadius: "8px",
                                        color: "#9ca3af",
                                    }}>
                                        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📄</div>
                                        <div>Preview will appear here</div>
                                        <div style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "#9ca3af" }}>
                                            Adjust the scale slider to generate preview
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add CSS for spinner animation */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            {/* Scaling Modal */}
            {/* <ResumeScalingModal
                isOpen={showScalingModal}
                onClose={() => setShowScalingModal(false)}
                resumeContent={resumeContent}
                resumeData={data}
                version={0}
            /> */}

            {/* Screen Preview */}
            <div
                className="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden no-print"
                style={{ height: "800px", overflow: "auto" }}
            >
                <div
                    ref={measureRef}
                    data-resume-preview="true"
                    style={{
                        fontFamily: '"Times New Roman", Times, serif',
                        fontSize: styles.fontSize,
                        lineHeight: styles.lineHeight,
                        color: "#000000",
                        padding: `${styles.paddingTop} ${styles.paddingSide} ${styles.paddingBottom} ${styles.paddingSide}`,
                        paddingRight: `calc(${styles.paddingSide} + 0.1in)`,
                        margin: "0",
                        height: "auto",
                        background: "white",
                        boxSizing: "border-box",
                        width: "100%",
                        letterSpacing: "-0.025em",
                    }}
                >
                    {resumeContent}
                </div>
            </div>

            {/* Print-Only Version */}
            <div
                id="resume-print-only"
                className="resume-container"
                style={{
                    display: "none", // Hidden on screen
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: styles.fontSize,
                    lineHeight: styles.lineHeight,
                    color: "#000000",
                    background: "white",
                    boxSizing: "border-box",
                    width: "100%",
                    height: "auto",
                    minHeight: "auto",
                    margin: "0",
                    padding: "0.2in 0.5in 0.5in 0.5in",
                    letterSpacing: "-0.025em",
                    overflow: "visible",
                }}
            >
                {resumeContent}
            </div>

            {/* Spinner Animation */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
           @media print {
                            body {
                                margin: 0 !important;
                                padding: 0 !important;
                                font-size: ${styles.fontSize} !important;
                                letter-spacing: 0.1px !important;
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                            }
                            
                            @page {
                                margin: 0 !important;
                                size: letter !important;
                            }
                            
                            * {
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            
                            .no-print {
                                display: none !important;
                            }
                            
                            #resume-print-only {
                                display: flex !important;
                                flex-direction: column !important;
                                transform: scale(1.02) !important;
                                transform-origin: top left !important;
                                width: 98% !important;
                            }
                            
                            /* Force single page layout and prevent breaks */
                            div[style*="marginBottom"] {
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                            }
                            
                            /* Additional print optimizations */
                            a {
                                color: black !important;
                                text-decoration: none !important;
                            }
                            
                            /* Ensure proper spacing */
                            body, html {
                                height: auto !important;
                                overflow: visible !important;
                            }
                        }`,
                }}
            />

            {/* Filename Confirmation Modal */}
            {showFilenameConfirmModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 2000,
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowFilenameConfirmModal(false);
                        }
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "white",
                            padding: "2rem",
                            borderRadius: "12px",
                            maxWidth: "400px",
                            width: "90%",
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                        }}
                    >
                        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", fontWeight: "600", color: "#1f2937" }}>
                            Confirm Filename Change
                        </h3>
                        <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.875rem", color: "#6b7280", lineHeight: "1.5" }}>
                            Are you sure you want to download the PDF with the filename:
                        </p>
                        <div style={{
                            backgroundColor: "#f3f4f6",
                            padding: "0.75rem",
                            borderRadius: "6px",
                            marginBottom: "1.5rem",
                            fontFamily: "monospace",
                            fontSize: "0.875rem",
                            color: "#1f2937",
                            wordBreak: "break-all"
                        }}>
                            {downloadFilename}
                        </div>
                        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => setShowFilenameConfirmModal(false)}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    backgroundColor: "#f3f4f6",
                                    color: "#374151",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                    fontWeight: "500",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setShowFilenameConfirmModal(false);
                                    await performDownload();
                                }}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    backgroundColor: "#3b82f6",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                    fontWeight: "500",
                                }}
                            >
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
