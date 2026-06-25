import React, { useState, useEffect } from "react";
import { toastUtils } from "../../../utils/toast";
import * as pdfjsLib from 'pdfjs-dist';
import { savePdf } from "../../../utils/savePdf.ts";
// import { ResumeScalingModal } from "./ResumeScalingModal";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const REQUIRED_MEDICAL_PDF_PAGES = 2;

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
        location: string;
        duration: string;
        roleType: string;
        responsibilities: string[];
    }>;
    projects: Array<{
        id: string;
        position: string;
        company: string;
        location: string;
        duration: string;
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
    showPublications?: boolean;
    showPrintButtons?: boolean;
    showDirectPdfButton?: boolean;
    sectionOrder?: string[]; // Add section order prop
    sectionTitles?: Record<string, string>;
    onDownloadClick?: () => void;
}

export const ResumePreviewMedical: React.FC<ResumePreviewProps> = ({
    data,
    showLeadership = true,
    showProjects = false,
    showPublications = false,
    showSummary = true,
    showPrintButtons = true,
    showDirectPdfButton = true,
    sectionOrder = ["personalInfo", "summary", "workExperience", "projects", "leadership", "skills", "education", "publications"],
    sectionTitles = {},
    onDownloadClick,
}) => {
    // The top-toolbar "Download PDF" button is only useful on the /optimize/:jobId
    // route. Hide it in the portal (everywhere else).
    const isOptimizeRoute =
        typeof window !== "undefined" && window.location.pathname.startsWith("/optimize");
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
    // Load last selected scale from localStorage
    const getLastSelectedScale = () => {
        const saved = localStorage.getItem('resumePreviewMedical_lastScale');
        return saved ? parseFloat(saved) : 1.0;
    };

    const [isPrinting, setIsPrinting] = useState(false);
    const [showScaleModal, setShowScaleModal] = useState(false);
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
                    <div style={{ marginBottom: "12px" }}>
                        <div
                            style={{
                                fontSize: "9pt",
                                borderBottom: "1px solid #000",
                                paddingBottom: "8px",
                                marginBottom: "6px",
                                fontWeight: "bold",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            SUMMARY
                        </div>
                        <div
                            style={{
                                textAlign: "justify",
                                fontSize: "9pt",
                                lineHeight: "1.3",
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
                    <div style={{ marginBottom: "12px" }}>
                        <div
                            style={{
                                fontSize: "9pt",
                                borderBottom: "1px solid #000",
                                paddingBottom: "8px",
                                marginBottom: "6px",
                                fontWeight: "bold",
                            }}
                        >
                            WORK EXPERIENCE
                        </div>
                        {data.workExperience.length > 0 ? (
                            data.workExperience.map((exp, index) => (
                                <div key={exp.id} style={{ marginBottom: "8px" }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            marginBottom: "3px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "9pt",
                                                fontWeight: "bold",
                                                flex: "1",
                                            }}
                                        >
                                            {exp.company}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "9pt",
                                                textAlign: "right",
                                            }}
                                        >
                                            {exp.location}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            marginBottom: "3px",
                                        }}
                                    >
                                        <div style={{ fontSize: "9pt" }}>
                                            {renderMarkedText(exp.position)}
                                            {exp.roleType &&
                                                exp.roleType !== "None" &&
                                                ` – ${exp.roleType}`}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "9pt",
                                                textAlign: "right",
                                            }}
                                        >
                                            {exp.duration}
                                        </div>
                                    </div>
                                    {exp.responsibilities.map(
                                        (resp, respIndex) =>
                                            resp.trim() && (
                                                <div
                                                    key={respIndex}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        marginBottom: "3px",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: "9pt",
                                                            marginRight: "4px",
                                                            minWidth: "8px",
                                                        }}
                                                    >
                                                        •
                                                    </span>
                                                    <div
                                                        style={{
                                                            textAlign: "justify",
                                                            fontSize: "9pt",
                                                            lineHeight: "1.3",
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
                                    fontSize: "9pt",
                                    fontStyle: "italic",
                                    color: "#666",
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
                    <div style={{ marginBottom: "12px" }}>
                        <div
                            style={{
                                fontSize: "9pt",
                                borderBottom: "1px solid #000",
                                paddingBottom: "8px",
                                marginBottom: "6px",
                                fontWeight: "bold",
                            }}
                        >
                            PROJECTS
                        </div>
                        {data.projects.map((project, index) => (
                            <div key={project.id} style={{ marginBottom: "8px" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        marginBottom: "3px",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "9pt",
                                            fontWeight: "bold",
                                            flex: "1",
                                        }}
                                    >
                                        {project.company}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "9pt",
                                            textAlign: "right",
                                        }}
                                    >
                                        {project.location}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        marginBottom: "3px",
                                    }}
                                >
                                    <div style={{ fontSize: "9pt" }}>

                                        <span style={{ fontWeight: "bold" }}>{project.position}</span>
                                        {project.roleType &&
                                            project.roleType !== "None" &&
                                            ` – ${project.roleType}`}
                                        {project.linkName && project.linkUrl && (
                                            <>
                                                {" - "}
                                                <a
                                                    href={project.linkUrl}
                                                    style={{
                                                        color: "blue",
                                                        textDecoration: "none",
                                                    }}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {project.linkName}
                                                </a>
                                            </>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "9pt",
                                            textAlign: "right",
                                        }}
                                    >
                                        {project.duration}
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
                                                    marginBottom: "3px",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: "9pt",
                                                        marginRight: "4px",
                                                        minWidth: "8px",
                                                    }}
                                                >
                                                    •
                                                </span>
                                                <div
                                                    style={{
                                                        textAlign: "justify",
                                                        fontSize: "9pt",
                                                        lineHeight: "1.3",
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
                    <div style={{ marginBottom: "12px" }}>
                        <div
                            style={{
                                fontSize: "9pt",
                                borderBottom: "1px solid #000",
                                paddingBottom: "8px",
                                marginBottom: "6px",
                                fontWeight: "bold",
                            }}
                        >
                            {headingFor("leadership", "Leadership & Achievements")}
                        </div>
                        {data.leadership.map((item) => (
                            <div
                                key={item.id}
                                style={{ fontSize: "9pt", marginBottom: "3px" }}
                            >
                                {renderMarkedText(item.title)}
                                {item.organization && (
                                    <>
                                        {", "}
                                        {renderMarkedText(item.organization)}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                );

            case "skills":
                return (
                    <div style={{ marginBottom: "12px" }}>
                        <div
                            style={{
                                fontSize: "9pt",
                                borderBottom: "1px solid #000",
                                paddingBottom: "8px",
                                marginBottom: "6px",
                                fontWeight: "bold",
                            }}
                        >
                            SKILLS
                        </div>
                        {data.skills.length > 0 ? (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "150px 20px 1fr",
                                    rowGap: "8px",
                                }}
                            >
                                {data.skills.map((category) => (
                                    <div
                                        key={category.id}
                                        style={{
                                            display: "contents",
                                            fontSize: "9pt",
                                            lineHeight: "1.3",
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: "150px",
                                                flexShrink: 0,
                                                fontWeight: "bold",
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
                                            {renderMarkedText(category.skills)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                style={{
                                    fontSize: "9pt",
                                    fontStyle: "italic",
                                    color: "#666",
                                }}
                            >
                                Your skills will appear here...
                            </div>
                        )}
                    </div>
                );

            case "education":
                return (
                    <div style={{ marginBottom: "12px" }}>
                        <div
                            style={{
                                fontSize: "9pt",
                                borderBottom: "1px solid #000",
                                paddingBottom: "8px",
                                marginBottom: "6px",
                                fontWeight: "bold",
                            }}
                        >
                            EDUCATION
                        </div>
                        {data.education.length > 0 ? (
                            data.education.map((edu, index) => (
                                <div
                                    key={edu.id}
                                    style={{
                                        marginBottom:
                                            index === data.education.length - 1
                                                ? "0px"
                                                : "6px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            marginBottom: "2px",
                                        }}
                                    >
                                        <div style={{ flex: "1", minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: "9pt",
                                                    fontWeight: "bold",
                                                    lineHeight: "1.3",
                                                }}
                                            >
                                                {edu.institution}
                                                {edu.location &&
                                                    `, ${edu.location}`}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "9pt",
                                                    lineHeight: "1.3",
                                                }}
                                            >
                                                {edu.degree}
                                                {edu.field && `, ${edu.field}`}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "9pt",
                                                textAlign: "right",
                                                marginLeft: "20px",
                                                flexShrink: 0,
                                                lineHeight: "1.3",
                                            }}
                                        >
                                            {edu.duration}
                                        </div>
                                    </div>
                                    {edu.additionalInfo && (
                                        <div
                                            style={{
                                                fontSize: "9pt",
                                                marginTop: "2px",
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
                                    fontSize: "9pt",
                                    fontStyle: "italic",
                                    color: "#666",
                                }}
                            >
                                Your education will appear here...
                            </div>
                        )}
                    </div>
                );

            case "publications":
                const hasPublications = data.publications && 
                    data.publications.length > 0 && 
                    data.publications.some(pub => pub.details && pub.details.trim() !== "");
                
                if (!hasPublications) return null;
                
                return (
                    <div style={{ marginBottom: "12px" }}>
                        <div
                            style={{
                                fontSize: "9pt",
                                borderBottom: "1px solid #000",
                                paddingBottom: "8px",
                                marginBottom: "6px",
                                fontWeight: "bold",
                            }}
                        >
                            PUBLICATIONS
                        </div>
                        {data.publications
                            .filter(pub => pub.details && pub.details.trim() !== "")
                            .map((publication) => (
                            <div
                                key={publication.id}
                                style={{ marginBottom: "6px" }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "9pt",
                                            marginRight: "4px",
                                            minWidth: "8px",
                                        }}
                                    >
                                        •
                                    </span>
                                    <div
                                        style={{
                                            fontSize: "9pt",
                                            lineHeight: "1.3",
                                            textAlign: "justify",
                                            flex: "1",
                                        }}
                                    >
                                        {renderMarkedText(
                                            publication.details
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };


    const generateFilename = (resumeData: ResumeData) => {
        const name = resumeData.personalInfo.name || "Resume";
        const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");
        return `${cleanName}_Resume.pdf`;
    };

    const handlePrint = () => {
        const filename = generateFilename(data);

        // Simple print with instructions
        const shouldPrint = window.confirm(
            `📄 PRINT SETTINGS:\n\n` +
            `• Filename: ${filename}\n` +
            `• Set Margins to "None"\n` +
            `• Disable "Headers and footers"\n` +
            `• Set Scale to 100%\n` +
            `• Use "Save as PDF" for best quality\n\n` +
            `Click OK to print your resume.`
        );

        if (shouldPrint) {
            // Set the document title to the filename for better PDF naming
            const originalTitle = document.title;
            document.title = filename.replace(".pdf", "");

            // Create a print style block (keeps your existing print rules but scoped)
            const printStyle = document.createElement("style");
            printStyle.id = "resume-medical-temp-print-style";
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

            // Find the print-only element in the component
            const originalPrintElem = document.getElementById("resume-print-only");
            if (!originalPrintElem) {
                // Fallback to calling normal print
                window.print();
                document.title = originalTitle;
                if (document.head.contains(printStyle)) document.head.removeChild(printStyle);
                return;
            }

            // Create a temporary wrapper and append a deep clone of the print-only element
            const wrapper = document.createElement("div");
            wrapper.id = "temp-resume-print-wrapper";
            // Add the same parent class so CSS rules that look for .resume-medical-print apply
            wrapper.className = "resume-medical-print";
            // Clone deeply so event handlers etc. are not needed
            const clone = originalPrintElem.cloneNode(true) as HTMLElement;
            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);

            // Add marker class to body so our print style hides everything else
            document.body.classList.add("printing-resume");

            // Small timeout to let DOM and style apply, then print
            setTimeout(() => {
                try {
                    window.print();
                } finally {
                    // Cleanup immediately after printing (give a small delay to avoid cutting off the print job)
                    setTimeout(() => {
                        // Restore title and remove temporary DOM + style + class
                        document.title = originalTitle;
                        document.body.classList.remove("printing-resume");
                        if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
                        const tmpStyle = document.getElementById("resume-medical-temp-print-style");
                        if (tmpStyle && tmpStyle.parentNode) tmpStyle.parentNode.removeChild(tmpStyle);
                        // Remove our printStyle if still present
                        if (document.head.contains(printStyle)) document.head.removeChild(printStyle);
                    }, 700);
                }
            }, 120);
        }
    };

    // Handle direct PDF download - use the preview PDF if available
    const handleDownloadResume = async () => {
        try {
            // Check if filename has been changed from original
            if (downloadFilename !== originalFilename && downloadFilename.trim()) {
                setShowFilenameConfirmModal(true);
                return;
            }

            const name = data.personalInfo?.name || "Medical_Resume";
            const cleanName = name.replace(/\s+/g, "_");
            const filename = downloadFilename || `${cleanName}_Resume.pdf`;

            // If we have a preview PDF blob, use it directly
            if (previewPdfBlob) {
                await savePdf(previewPdfBlob, filename);
                toastUtils.success("✅ PDF downloaded successfully!");
                if (onDownloadClick) onDownloadClick();
                return;
            }

            // Otherwise generate new PDF
            setIsPrinting(true);
            const pdfServerUrl = import.meta.env.VITE_PDF_SERVER_URL || "http://localhost:8000";
            const loadingToast = toastUtils.loading("Making the best optimal PDF... Please wait.");

            // Auto-enable showPublications if publications exist in data
            const hasPublications = data.publications &&
                data.publications.length > 0 &&
                data.publications.some(pub => pub.details && pub.details.trim() !== "");
            const finalShowPublications = hasPublications || showPublications;

            // Ensure publications is in sectionOrder
            let finalSectionOrder = [...sectionOrder];
            if (!finalSectionOrder.includes("publications")) {
                finalSectionOrder.push("publications");
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
                    showPublications: finalShowPublications,
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
            setIsPrinting(false);
            // Clean up preview URL
            if (previewPdfUrl) {
                window.URL.revokeObjectURL(previewPdfUrl);
                setPreviewPdfUrl(null);
                setPreviewPdfBlob(null);
            }
            toastUtils.success("✅ PDF downloaded successfully!");
            if (onDownloadClick) onDownloadClick();
        } catch (error: any) {
            console.error("Error generating PDF:", error);
            setIsPrinting(false);
            toastUtils.error(`Failed to generate PDF: ${error.message}`);
        }
    };

    const showPrintInstructions = () => {
        alert(`How to download your resume:

1. Click "Download Resume" to open the scaling modal.
2. Adjust the scale slider until the page count is correct.
3. Confirm the live preview looks right.
4. Click "Download PDF" to save your resume.

Tip: For medical resumes, make sure the PDF is exactly ${REQUIRED_MEDICAL_PDF_PAGES} pages before downloading.`);
    };

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

            // Auto-enable showPublications if publications exist in data
            const hasPublications = data.publications && 
                data.publications.length > 0 && 
                data.publications.some(pub => pub.details && pub.details.trim() !== "");
            const finalShowPublications = hasPublications || showPublications;
            
            // Ensure publications is in sectionOrder
            let finalSectionOrder = [...sectionOrder];
            if (!finalSectionOrder.includes("publications")) {
                finalSectionOrder.push("publications");
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
                    showPublications: finalShowPublications,
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

            try {
                const arrayBuffer = await pdfBlob.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const numPages = pdf.numPages;
                setPdfPageCount(numPages);
            } catch (pdfError) {
                console.error("Error getting PDF page count:", pdfError);
                setPdfPageCount(null);
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
        }
    }, [showScaleModal, previewPdfUrl]);

    // Generate preview when modal opens
    useEffect(() => {
        if (showScaleModal) {
            generatePreview(selectedScale);
        }
    }, [showScaleModal]);

    // Update filename when name changes
    useEffect(() => {
        if (data.personalInfo?.name) {
            const name = data.personalInfo.name || "Resume";
            const cleanName = name.replace(/\s+/g, "_");
            const filename = `${cleanName}_Resume.pdf`;
            setDownloadFilename(filename);
            setOriginalFilename(filename);
        }
    }, [data.personalInfo?.name]);

    const resumeContent = (
        <>
            {/* Header - Always first */}
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <div
                    style={{
                        fontSize: "16px",
                        marginTop: "8px",
                        marginBottom: "6px",
                        fontWeight: "bold",
                    }}
                >
                    {data.personalInfo.name || "Your Name"}
                </div>
                <div style={{ fontSize: "9pt", marginBottom: "6px" }}>
                    {data.personalInfo.title || "Your Professional Title"}
                </div>
                <div style={{ fontSize: "9pt", marginBottom: "8px" }}>
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
                                href={getPublicationsUrl(data.personalInfo.publications)}
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

            {/* Render sections based on section order */}
            {sectionOrder
                .filter(sectionId => sectionId !== "personalInfo") // Skip personal info as it's always first
                .map(sectionId => renderSection(sectionId))}
        </>
    );

    // Helper function to perform the actual download
    const performDownload = async () => {
        try {
            const name = data.personalInfo?.name || "Medical_Resume";
            const cleanName = name.replace(/\s+/g, "_");
            const filename = downloadFilename || `${cleanName}_Resume.pdf`;

            // If we have a preview PDF blob, use it directly
            if (previewPdfBlob) {
                await savePdf(previewPdfBlob, filename);
                toastUtils.success("✅ PDF downloaded successfully!");
                if (onDownloadClick) onDownloadClick();
                return;
            }

            // Otherwise generate new PDF
            setIsPrinting(true);
            const pdfServerUrl = import.meta.env.VITE_PDF_SERVER_URL || "http://localhost:8000";
            const loadingToast = toastUtils.loading("Making the best optimal PDF... Please wait.");

            // Auto-enable showPublications if publications exist in data
            const hasPublications = data.publications &&
                data.publications.length > 0 &&
                data.publications.some(pub => pub.details && pub.details.trim() !== "");
            const finalShowPublications = hasPublications || showPublications;

            // Ensure publications is in sectionOrder
            let finalSectionOrder = [...sectionOrder];
            if (!finalSectionOrder.includes("publications")) {
                finalSectionOrder.push("publications");
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
                    showPublications: finalShowPublications,
                },
                sectionTitles: sectionTitles || {},
                sectionOrder: finalSectionOrder,
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
            if (onDownloadClick) onDownloadClick();
        } catch (error: any) {
            console.error("Download failed:", error);
            toastUtils.error(`Failed to download PDF: ${error.message}`);
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="resume-medical-print">
            {showPrintButtons && (
                <div
                    className="no-print"
                    style={{ marginBottom: "1rem", textAlign: "center" }}
                >
                    <button
                        onClick={() => setShowScaleModal(true)}
                        disabled={isPrinting}
                        style={{
                            backgroundColor: isPrinting ? "#9ca3af" : "#10b981",
                            color: "white",
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: "6px",
                            cursor: isPrinting ? "not-allowed" : "pointer",
                            fontWeight: "600",
                            fontSize: "14px",
                            transition: "background-color 0.2s",
                        }}
                    >
                        {isPrinting ? "Preparing PDF..." : "Download Resume"}
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
                        backgroundColor: "rgba(15, 23, 42, 0.48)",
                        backdropFilter: "blur(2px)",
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
                                    Fine-tune scale and confirm 2-page output in live preview.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowScaleModal(false);
                                    setPdfPageCount(null);
                                }}
                                disabled={isPrinting}
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
                                    cursor: isPrinting ? "not-allowed" : "pointer",
                                    opacity: isPrinting ? 0.6 : 1,
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
                                            localStorage.setItem('resumePreviewMedical_lastScale', newScale.toString());
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
                                                localStorage.setItem('resumePreviewMedical_lastScale', newScale.toString());
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
                                                localStorage.setItem('resumePreviewMedical_lastScale', newScale.toString());
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
                                                localStorage.setItem('resumePreviewMedical_lastScale', newScale.toString());
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
                                            Keep preview at 2 pages for best medical resume format.
                                        </span>
                                    </div>
                                </div>

                                {/* Page Count Warning - Below 2 pages */}
                                {pdfPageCount !== null && pdfPageCount < REQUIRED_MEDICAL_PDF_PAGES && (
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
                                                Resume currently has {pdfPageCount} page{pdfPageCount === 1 ? "" : "s"}
                                            </strong>
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "#78350f", lineHeight: "1.5" }}>
                                            Increase scale slightly so preview reaches {REQUIRED_MEDICAL_PDF_PAGES} pages before download.
                                        </div>
                                    </div>
                                )}

                                {/* Page Count Warning - Above 2 pages */}
                                {pdfPageCount !== null && pdfPageCount > REQUIRED_MEDICAL_PDF_PAGES && (
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
                                            Reduce scale slightly so preview fits in {REQUIRED_MEDICAL_PDF_PAGES} pages before download.
                                        </div>
                                    </div>
                                )}

                                {/* Page Count Success - Medical resume exactly 2 pages */}
                                {pdfPageCount !== null && pdfPageCount === REQUIRED_MEDICAL_PDF_PAGES && (
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
                                                Your resume looks good in {REQUIRED_MEDICAL_PDF_PAGES} pages - Ready to download
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
                                        disabled={isPrinting}
                                        style={{
                                            flex: 1,
                                            backgroundColor: "#eef2f7",
                                            color: "#475569",
                                            padding: "10px 24px",
                                            border: "1px solid #dbe3ef",
                                            borderRadius: "8px",
                                            fontSize: "1rem",
                                            fontWeight: "600",
                                            cursor: isPrinting ? "not-allowed" : "pointer",
                                            opacity: isPrinting ? 0.5 : 1,
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDownloadResume}
                                        disabled={isPrinting || isGeneratingPreview || !previewPdfBlob || (pdfPageCount !== null && pdfPageCount !== REQUIRED_MEDICAL_PDF_PAGES)}
                                        style={{
                                            flex: 1,
                                            background: (isPrinting || isGeneratingPreview || !previewPdfBlob || (pdfPageCount !== null && pdfPageCount !== REQUIRED_MEDICAL_PDF_PAGES))
                                                ? "#9ca3af"
                                                : "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                                            color: "white",
                                            padding: "10px 24px",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontSize: "1rem",
                                            fontWeight: "600",
                                            cursor: (isPrinting || isGeneratingPreview || !previewPdfBlob || (pdfPageCount !== null && pdfPageCount !== REQUIRED_MEDICAL_PDF_PAGES)) ? "not-allowed" : "pointer",
                                            boxShadow: (isPrinting || isGeneratingPreview || !previewPdfBlob || (pdfPageCount !== null && pdfPageCount !== REQUIRED_MEDICAL_PDF_PAGES))
                                                ? "none"
                                                : "0 6px 18px rgba(16, 185, 129, 0.35)",
                                            transition: "all 0.2s",
                                        }}
                                    >
                                        {isPrinting ? "Generating..." : (pdfPageCount !== null && pdfPageCount < REQUIRED_MEDICAL_PDF_PAGES) ? `Showing ${pdfPageCount} page${pdfPageCount === 1 ? "" : "s"} - increase scale` : (pdfPageCount !== null && pdfPageCount > REQUIRED_MEDICAL_PDF_PAGES) ? `Showing ${pdfPageCount} pages - reduce scale` : previewPdfBlob ? "Download PDF" : "Generate Preview First"}
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

            {/* Print Control Buttons */}
            {showPrintButtons && (
                <div className="flex gap-3 mb-4 no-print">
                    {/* <button
                        onClick={() => setShowScalingModal(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-semibold"
                    >
                        In-House Scaling
                    </button> */}
                    {/* "Download PDF" toolbar button — only shown on /optimize routes,
                        hidden in the portal (of no use there). */}
                    {showDirectPdfButton && isOptimizeRoute && (
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                            Download PDF
                        </button>
                    )}
                    <button
                        onClick={showPrintInstructions}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                        Print Instructions
                    </button>
                </div>
            )}

            {/* Scaling Modal */}
            {/* <ResumeScalingModal
                isOpen={showScalingModal}
                onClose={() => setShowScalingModal(false)}
                resumeContent={resumeContent}
                resumeData={data}
                version={2}
            /> */}

            {/* Screen Preview */}
            <div
                className="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden no-print"
                style={{ height: "800px", overflow: "auto" }}
            >
                <div
                    style={{
                        fontFamily: '"Times New Roman", Times, serif',
                        fontSize: "9pt",
                        lineHeight: "1.2",
                        color: "#000000",
                        padding: "0.1in 0.5in",
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

            {/* Print-Only Version - Hidden on screen, visible only when printing */}
            <div
                id="resume-print-only"
                data-resume-preview
                style={{
                    display: "none", // Hidden on screen
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: "9pt",
                    lineHeight: "1.2",
                    color: "#000000",
                    background: "white",
                    boxSizing: "border-box",
                    width: "100%",
                    minHeight: "auto",
                    height: "auto",
                    margin: "0",
                    padding: "0.1in 0.3in",
                    letterSpacing: "-0.025em",
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
                    `,
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
                        zIndex: 2200,
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
