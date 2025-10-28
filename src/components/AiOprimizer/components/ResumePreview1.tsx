import React, { useRef, useEffect, useState } from "react";

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
}

interface ResumePreviewHybridProps {
    data: ResumeData;
    showLeadership?: boolean;
    showProjects?: boolean;
    showSummary?: boolean;
    showChanges?: boolean;
    changedFields?: Set<string>;
    onDownloadClick?: () => void;
    showPrintButtons?: boolean;
    sectionOrder?: string[]; // Add section order prop
}

export const ResumePreview1: React.FC<ResumePreviewHybridProps> = ({
    data,
    showLeadership = true,
    showProjects = false,
    showSummary = true,
    showChanges = false,
    changedFields = new Set(),
    onDownloadClick,
    showPrintButtons = true,
    sectionOrder = ["personalInfo", "summary", "workExperience", "projects", "leadership", "skills", "education"],
}) => {
    const [scalingFactor, setScalingFactor] = useState(1);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const measureRef = useRef<HTMLDivElement>(null);

    // Enhanced print function with automatic settings
    const handlePrint = () => {
        setShowWarningModal(true);
    };

    // Function to handle actual printing after user confirms
    // const handlePrintConfirm = () => {
    //     setShowWarningModal(false);

    //     const originalTitle = document.title;
    //     document.title = `${data.personalInfo.name || "Resume"}_Resume`;

    //     const printStyle = document.createElement("style");
    //     printStyle.innerHTML = `
    //         @media print {
    //             body {
    //                 margin: 0 !important;
    //                 padding: 0 !important;
    //                 -webkit-print-color-adjust: exact !important;
    //                 print-color-adjust: exact !important;
    //                 color-adjust: exact !important;
    //                 height: 100vh !important;
    //                 max-height: 100vh !important;
    //                 overflow: hidden !important;
    //             }

    //             @page {
    //                 size: letter !important;
    //                 margin: 0 !important;
    //             }

    //             #resume-print-only {
    //                 display: flex !important;
    //                 flex-direction: column !important;
    //                 font-family: "Times New Roman", Times, serif !important;
    //                 font-size: 11px !important;
    //                 font-weight: 500;
    //                 line-height: 1.25 !important;
    //                 letter-spacing: 0.1px !important;
    //                 color: #000 !important;
    //                 width: 100% !important;
    //                 height: 100vh !important;
    //                 max-height: 100vh !important;
    //                 overflow: hidden !important;
    //                 padding: 0.5in 0.6in !important;
    //                 box-sizing: border-box !important;
    //                 page-break-inside: avoid !important;
    //                 page-break-before: avoid !important;
    //                 page-break-after: avoid !important;
    //             }

    //             * {
    //                 page-break-before: avoid !important;
    //                 page-break-after: avoid !important;
    //                 page-break-inside: avoid !important;
    //                 break-inside: avoid !important;
    //             }
    //         }
    //     `;

    //     document.head.appendChild(printStyle);

    //     setTimeout(() => {
    //         window.print();
    //         setTimeout(() => {
    //             document.title = originalTitle;
    //             document.head.removeChild(printStyle);
    //         }, 1000);
    //     }, 100);

    //     if (onDownloadClick) {
    //         onDownloadClick();
    //     }
    // };

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

    const showPrintInstructions = () => {
        alert(`Print Settings Instructions:
        
When the print dialog opens, please set:
• Destination: Save as PDF (or your preferred printer)
• Pages: 1 (or "All" if you prefer)
• Scale: 105% (custom)
• Pages per sheet: 1
• Margins: None (or Minimum)

These settings will give you the best results for your resume PDF.`);
    };

    // Calculate content density and determine scaling factor
    useEffect(() => {
        const calculateContentDensity = () => {
            let totalLines = 0;

            // Personal info header
            totalLines += 4;

            const sections = ["workExperience", "skills", "education"];
            if (showSummary && data.summary?.trim() !== "")
                sections.push("summary");
            if (showProjects && data.projects?.length > 0)
                sections.push("projects");
            if (showLeadership && data.leadership?.length > 0)
                sections.push("leadership");
            totalLines += sections.length * 2;

            // Summary
            if (showSummary && data.summary) {
                totalLines += Math.ceil(data.summary.length / 60);
            }

            // Work experience
            totalLines += data.workExperience.length;
            data.workExperience.forEach((exp) => {
                totalLines += 1; // Header line
                exp.responsibilities
                    .filter((r) => r.trim())
                    .forEach((r) => {
                        totalLines += Math.ceil(r.length / 80); // Adjusted for single-line layout
                    });
            });

            // Projects
            if (showProjects && data.projects) {
                data.projects.forEach((proj) => {
                    totalLines += 1; // Header line
                    proj.responsibilities
                        .filter((r) => r.trim())
                        .forEach((r) => {
                            totalLines += Math.ceil(r.length / 80);
                        });
                });
            }

            // Leadership
            if (showLeadership && data.leadership) {
                data.leadership.forEach((l) => {
                    totalLines += 1;
                });
            }

            // Skills
            data.skills.forEach(() => {
                totalLines += 1;
            });

            // Education
            data.education.forEach((e) => {
                totalLines += 1;
                if (e.additionalInfo) {
                    totalLines += Math.ceil(e.additionalInfo.length / 80);
                }
            });

            const targetLines = 70;
            let scale = 1;
            if (totalLines > targetLines) {
                scale = Math.max(0.94, targetLines / totalLines);
            }
            scale = Math.min(1.0, scale);

            return Math.round(scale * 100) / 100;
        };

        const newScaling = calculateContentDensity();
        setScalingFactor(newScaling);
    }, [data, showLeadership, showProjects, showSummary]);

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
            return "Website";
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

    // Function to render sections based on section order
    const renderSection = (sectionId: string) => {
        switch (sectionId) {
            case "summary":
                if (!showSummary) return null;
                return (
                    <div
                        style={{
                            marginBottom:
                                Math.max(8, Math.round(10 * scalingFactor)) + "px",
                            ...getHighlightStyle("summary"),
                        }}
                    >
                        <div
                            style={{
                                fontSize:
                                    Math.max(10, Math.round(12 * scalingFactor)) +
                                    "px",
                                borderBottom: "1px solid #000",
                                paddingBottom: "1px",
                                marginBottom:
                                    Math.max(3, Math.round(4 * scalingFactor)) +
                                    "px",
                                fontWeight: "bold",
                                letterSpacing: "0.1px",
                            }}
                        >
                            SUMMARY
                        </div>
                        <div
                            style={{
                                textAlign: "justify",
                                fontSize:
                                    Math.max(9, Math.round(11 * scalingFactor)) +
                                    "px",
                                lineHeight: Math.max(
                                    1.15,
                                    1.25 * scalingFactor
                                ).toString(),
                                letterSpacing: "0.1px",
                            }}
                        >
                            {data.summary ||
                                "Your professional summary will appear here..."}
                        </div>
                    </div>
                );

            case "workExperience":
                return (
                    <div
                        style={{
                            marginBottom:
                                Math.max(8, Math.round(10 * scalingFactor)) + "px",
                            ...getHighlightStyle("workExperience"),
                        }}
                    >
                        <div
                            style={{
                                fontSize:
                                    Math.max(10, Math.round(12 * scalingFactor)) + "px",
                                borderBottom: "1px solid #000",
                                paddingBottom: "1px",
                                marginBottom:
                                    Math.max(3, Math.round(4 * scalingFactor)) + "px",
                                fontWeight: "bold",
                                letterSpacing: "0.1px",
                            }}
                        >
                            WORK EXPERIENCE
                        </div>
                        {data.workExperience.length > 0 ? (
                            data.workExperience.map((exp, index) => (
                                <div
                                    key={exp.id}
                                    style={{
                                        marginBottom:
                                            index === data.workExperience.length - 1
                                                ? "0px"
                                                : Math.max(
                                                      3,
                                                      Math.round(4 * scalingFactor)
                                                  ) + "px",
                                    }}
                                >
                                    {/* Header on single line with Flexbox */}
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            fontSize:
                                                Math.max(
                                                    9,
                                                    Math.round(11 * scalingFactor)
                                                ) + "px",
                                            fontWeight: "bold",
                                            letterSpacing: "0.001px",
                                            lineHeight: Math.max(
                                                1.05,
                                                1.15 * scalingFactor
                                            ).toString(),
                                            marginBottom:
                                                Math.max(
                                                    1,
                                                    Math.round(2 * scalingFactor)
                                                ) + "px",
                                        }}
                                    >
                                        <span
                                            style={{
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                paddingRight: "10px",
                                            }}
                                        >
                                            {exp.position}
                                            {exp.company && `, ${exp.company}`}
                                            {exp.location && `, ${exp.location}`}
                                            {exp.roleType &&
                                                exp.roleType !== "None" &&
                                                ` — ${exp.roleType}`}
                                        </span>
                                        <span
                                            style={{
                                                flexShrink: 0,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {exp.duration}
                                        </span>
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
                                                            Math.max(
                                                                0.3,
                                                                Math.round(
                                                                    1 * scalingFactor
                                                                )
                                                            ) + "px",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize:
                                                                Math.max(
                                                                    9,
                                                                    Math.round(
                                                                        11 *
                                                                            scalingFactor
                                                                    )
                                                                ) + "px",
                                                            marginRight: "5px",
                                                            minWidth: "8px",
                                                            lineHeight: Math.max(
                                                                1.15,
                                                                1.25 * scalingFactor
                                                            ).toString(),
                                                        }}
                                                    >
                                                        •
                                                    </span>
                                                    <div
                                                        style={{
                                                            textAlign: "justify",
                                                            fontSize:
                                                                Math.max(
                                                                    9,
                                                                    Math.round(
                                                                        11 *
                                                                            scalingFactor
                                                                    )
                                                                ) + "px",
                                                            lineHeight: Math.max(
                                                                1.15,
                                                                1.25 * scalingFactor
                                                            ).toString(),
                                                            letterSpacing: "0.1px",
                                                        }}
                                                    >
                                                        {resp}
                                                    </div>
                                                </div>
                                            )
                                    )}
                                </div>
                            ))
                        ) : (
                            <div
                                style={{
                                    fontSize:
                                        Math.max(9, Math.round(11 * scalingFactor)) +
                                        "px",
                                    fontStyle: "italic",
                                    color: "#666",
                                    letterSpacing: "0.1px",
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
                            marginBottom:
                                Math.max(8, Math.round(10 * scalingFactor)) + "px",
                            ...getHighlightStyle("projects"),
                        }}
                    >
                        <div
                            style={{
                                fontSize:
                                    Math.max(10, Math.round(12 * scalingFactor)) +
                                    "px",
                                borderBottom: "1px solid #000",
                                paddingBottom: "1px",
                                marginBottom:
                                    Math.max(3, Math.round(4 * scalingFactor)) +
                                    "px",
                                fontWeight: "bold",
                                letterSpacing: "0.1px",
                            }}
                        >
                            PROJECTS
                        </div>
                        {data.projects.map((project, index) => (
                            <div
                                key={project.id}
                                style={{
                                    marginBottom:
                                        index === data.projects.length - 1
                                            ? "0px"
                                            : Math.max(
                                                  2,
                                                  Math.round(4 * scalingFactor)
                                              ) + "px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        fontSize:
                                            Math.max(
                                                9,
                                                Math.round(11 * scalingFactor)
                                            ) + "px",
                                        fontWeight: "bold",
                                        letterSpacing: "0.01px",
                                        lineHeight: Math.max(
                                            1.05,
                                            1.1 * scalingFactor
                                        ).toString(),
                                        marginBottom:
                                            Math.max(
                                                1,
                                                Math.round(2 * scalingFactor)
                                            ) + "px",
                                    }}
                                >
                                    <span
                                        style={{
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            paddingRight: "10px",
                                        }}
                                    >
                                        {project.position}
                                        {project.company && `, ${project.company}`}
                                        {project.location &&
                                            `, ${project.location}`}
                                        {project.roleType &&
                                            project.roleType !== "None" &&
                                            ` — ${project.roleType}`}
                                        {project.linkName && project.linkUrl && (
                                            <>
                                                {" — "}
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
                                    </span>
                                    <span
                                        style={{
                                            flexShrink: 0,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {project.duration}
                                    </span>
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
                                                        Math.max(
                                                            0.5,
                                                            Math.round(
                                                                1 * scalingFactor
                                                            )
                                                        ) + "px",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize:
                                                            Math.max(
                                                                9,
                                                                Math.round(
                                                                    11 *
                                                                        scalingFactor
                                                                )
                                                            ) + "px",
                                                        marginRight: "5px",
                                                        minWidth: "8px",
                                                        lineHeight: Math.max(
                                                            1.15,
                                                            1.25 * scalingFactor
                                                        ).toString(),
                                                    }}
                                                >
                                                    •
                                                </span>
                                                <div
                                                    style={{
                                                        textAlign: "justify",
                                                        fontSize:
                                                            Math.max(
                                                                9,
                                                                Math.round(
                                                                    11 *
                                                                        scalingFactor
                                                                )
                                                            ) + "px",
                                                        lineHeight: Math.max(
                                                            1.15,
                                                            1.25 * scalingFactor
                                                        ).toString(),
                                                        letterSpacing: "0.01px",
                                                    }}
                                                >
                                                    {resp}
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
                            marginBottom:
                                Math.max(8, Math.round(10 * scalingFactor)) +
                                "px",
                            ...getHighlightStyle("leadership"),
                        }}
                    >
                        <div
                            style={{
                                fontSize:
                                    Math.max(
                                        10,
                                        Math.round(12 * scalingFactor)
                                    ) + "px",
                                borderBottom: "1px solid #000",
                                paddingBottom: "1px",
                                marginBottom:
                                    Math.max(3, Math.round(4 * scalingFactor)) +
                                    "px",
                                fontWeight: "bold",
                                letterSpacing: "0.1px",
                            }}
                        >
                            LEADERSHIP & VOLUNTEERING
                        </div>
                        {data.leadership.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    fontSize:
                                        Math.max(
                                            9,
                                            Math.round(11 * scalingFactor)
                                        ) + "px",
                                    marginBottom:
                                        Math.max(
                                            1.5,
                                            Math.round(2 * scalingFactor)
                                        ) + "px",
                                    letterSpacing: "0.1px",
                                    lineHeight: Math.max(
                                        1.05,
                                        1.15 * scalingFactor
                                    ).toString(),
                                }}
                            >
                                <span style={{ fontWeight: "bold" }}>
                                    {item.title}
                                </span>
                                {item.organization && `, ${item.organization}`}
                            </div>
                        ))}
                    </div>
                );

            case "skills":
                return (
                    <div
                        style={{
                            marginBottom:
                                Math.max(8, Math.round(10 * scalingFactor)) + "px",
                            ...getHighlightStyle("skills"),
                        }}
                    >
                        <div
                            style={{
                                fontSize:
                                    Math.max(10, Math.round(12 * scalingFactor)) + "px",
                                borderBottom: "1px solid #000",
                                paddingBottom: "1px",
                                marginBottom:
                                    Math.max(3, Math.round(4 * scalingFactor)) + "px",
                                fontWeight: "bold",
                                letterSpacing: "0.1px",
                            }}
                        >
                            SKILLS
                        </div>
                        {data.skills.length > 0 ? (
                            data.skills.map((category) => (
                                <div
                                    key={category.id}
                                    style={{
                                        fontSize:
                                            Math.max(
                                                9,
                                                Math.round(11 * scalingFactor)
                                            ) + "px",
                                        marginBottom:
                                            Math.max(2, Math.round(3 * scalingFactor)) +
                                            "px",
                                        lineHeight: Math.max(
                                            1.15,
                                            1.25 * scalingFactor
                                        ).toString(),
                                        letterSpacing: "0.01px",
                                        display: "flex",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: "160px",
                                            flexShrink: 0,
                                            fontWeight: "bold",
                                            letterSpacing: "0.01px",
                                        }}
                                    >
                                        {category.category}
                                    </span>
                                    <span
                                        style={{
                                            fontWeight: "bold",
                                            margin: "0 5px",
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
                                        {formatSkills(category.skills)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div
                                style={{
                                    fontSize:
                                        Math.max(9, Math.round(11 * scalingFactor)) +
                                        "px",
                                    fontStyle: "italic",
                                    color: "#666",
                                    letterSpacing: "0.01px",
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
                        style={{
                            marginBottom: "0px",
                            ...getHighlightStyle("education"),
                        }}
                    >
                        <div
                            style={{
                                fontSize:
                                    Math.max(10, Math.round(12 * scalingFactor)) + "px",
                                borderBottom: "1px solid #000",
                                paddingBottom: "1px",
                                marginBottom:
                                    Math.max(3, Math.round(4 * scalingFactor)) + "px",
                                fontWeight: "bold",
                                letterSpacing: "0.1px",
                            }}
                        >
                            EDUCATION
                        </div>
                        <div>
                            {data.education.length > 0 ? (
                                data.education.map((edu, index) => (
                                    <div
                                        key={edu.id}
                                        style={{
                                            marginBottom:
                                                index === data.education.length - 1
                                                    ? "0px"
                                                    : Math.max(
                                                          2,
                                                          Math.round(3 * scalingFactor)
                                                      ) + "px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                fontSize:
                                                    Math.max(
                                                        9,
                                                        Math.round(11 * scalingFactor)
                                                    ) + "px",
                                                letterSpacing: "0.1px",
                                                lineHeight: Math.max(
                                                    1.05,
                                                    1.15 * scalingFactor
                                                ).toString(),
                                                marginBottom:
                                                    Math.max(
                                                        0.5,
                                                        Math.round(1 * scalingFactor)
                                                    ) + "px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    paddingRight: "10px",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontWeight: "bold",
                                                        letterSpacing: "0.0001px",
                                                    }}
                                                >
                                                    {edu.institution}
                                                    {edu.location &&
                                                        `, ${edu.location}`}
                                                </span>
                                                <span>
                                                    {" "}
                                                    - {edu.degree}
                                                    {edu.field && `, ${edu.field}`}
                                                </span>
                                            </span>
                                            <span
                                                style={{
                                                    flexShrink: 0,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {edu.duration}
                                            </span>
                                        </div>
                                        {edu.additionalInfo && (
                                            <div
                                                style={{
                                                    fontSize:
                                                        Math.max(
                                                            9,
                                                            Math.round(
                                                                11 * scalingFactor
                                                            )
                                                        ) + "px",
                                                    letterSpacing: "0.1px",
                                                    lineHeight: Math.max(
                                                        1.05,
                                                        1.15 * scalingFactor
                                                    ).toString(),
                                                    marginBottom: "0px",
                                                }}
                                            >
                                                {edu.additionalInfo}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div
                                    style={{
                                        fontSize:
                                            Math.max(
                                                9,
                                                Math.round(11 * scalingFactor)
                                            ) + "px",
                                        fontStyle: "italic",
                                        color: "#666",
                                        letterSpacing: "0.1px",
                                        marginBottom: "0px",
                                    }}
                                >
                                    Your education will appear here...
                                </div>
                            )}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const getHighlightStyle = (fieldPath: string) => {
        if (showChanges && changedFields.has(fieldPath)) {
            return {
                backgroundColor: "#fef3c7",
                padding: "1px 2px",
                borderRadius: "2px",
            };
        }
        return {};
    };

    const formatSkills = (skillsString: string) => {
        if (!skillsString) return "";
        return skillsString
            .split(",")
            .map((skill) => skill.trim())
            .join(", ");
    };

    const resumeContent = (
        <>
            {/* Header - Always first */}
            <div
                style={{
                    textAlign: "center",
                    marginBottom: "8px",
                    ...getHighlightStyle("personalInfo"),
                }}
            >
                <div
                    style={{
                        fontSize: "13px",
                        marginBottom: "2px",
                        fontWeight: "bold",
                        letterSpacing: "0.3px",
                    }}
                >
                    {data.personalInfo.name || "Your Name"}
                </div>
                <div
                    style={{
                        fontSize:
                            Math.max(11, Math.round(13 * scalingFactor)) + "px",
                        marginBottom: "3px",
                        letterSpacing: "0.25px",
                    }}
                >
                    {data.personalInfo.title || "Your Professional Title"}
                </div>
                <div
                    style={{
                        fontSize:
                            Math.max(9, Math.round(11 * scalingFactor)) + "px",
                        letterSpacing: "0.25px",
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
                </div>
            </div>

            {/* Render sections based on section order */}
            {sectionOrder
                .filter(sectionId => sectionId !== "personalInfo") // Skip personal info as it's always first
                .map(sectionId => renderSection(sectionId))}
        </>
    );

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
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
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
                            border: "3px solid #f59e0b",
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
                            ⚠️ IMPORTANT INSTRUCTIONS FOR INTERNS ⚠️
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
                                    Always set Pages to{" "}
                                    <span
                                        style={{
                                            color: "#dc2626",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        CURRENT
                                    </span>
                                </strong>{" "}
                                — do NOT skip this.
                            </div>
                            <div style={{ marginBottom: "0.75rem" }}>
                                <strong>
                                    Set Scale between{" "}
                                    <span
                                        style={{
                                            color: "#dc2626",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        99—102
                                    </span>
                                </strong>{" "}
                                to ensure the resume fits exactly 1 page.
                            </div>
                            <div style={{ marginBottom: "0.75rem" }}>
                                <strong>
                                    Set Margins to{" "}
                                    <span
                                        style={{
                                            color: "#dc2626",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        NONE
                                    </span>
                                </strong>{" "}
                                — no exceptions.
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
                            Click OK to print your resume.
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

            {/* Print Control Buttons */}
            {showPrintButtons && (
                <div
                    className="no-print"
                    style={{ marginBottom: "1rem", textAlign: "center" }}
                >
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
                        fontSize:
                            Math.max(9, Math.round(11 * scalingFactor)) + "px",
                        lineHeight: Math.max(
                            1.15,
                            1.25 * scalingFactor
                        ).toString(),
                        color: "#000000",
                        padding: "0.5in 0.6in",
                        margin: "0",
                        height: "auto",
                        background: "white",
                        boxSizing: "border-box",
                        width: "100%",
                        letterSpacing: "0.1px",
                    }}
                >
                    {resumeContent}
                    {/* Debug info - only visible in development */}
                    <div
                        style={{
                            fontSize: "7pt",
                            color: "#999",
                            marginTop: "10px",
                            textAlign: "right",
                        }}
                    >
                        Scale: {scalingFactor}x
                    </div>
                </div>
            </div>

            {/* Print-Only Version */}
            <div
                id="resume-print-only"
                className="resume-container print:flex"
                style={{
                    display: "none",
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: "11px",
                    lineHeight: "1.25",
                    color: "#000000",
                    background: "white",
                    boxSizing: "border-box",
                    width: "100%",
                    minHeight: "100vh",
                    margin: "0",
                    padding: "0.5in 0.6in",
                    flexDirection: "column",
                    letterSpacing: "0.1px",
                    pageBreakInside: "avoid",
                }}
            >
                {resumeContent}
            </div>

            {/* Print Styles */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        @media print {
                            body {
                                margin: 0 !important;
                                padding: 0 !important;
                                font-size: 11px !important;
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
                        }
                    `,
                }}
            />
        </div>
    );
};
