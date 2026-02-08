import html2pdf from 'html2pdf.js';

/**
 * Export HTML content as a styled PDF
 * @param {string} htmlContent - The HTML string to render in the PDF
 * @param {string} title - Title shown at the top of the PDF
 * @param {string} filename - Name of the downloaded file (without .pdf)
 */
export const exportToPdf = (htmlContent, title, filename = 'export') => {
    // Create a temporary container with styling
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 20px;">
            <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #3b82f6;">
                <h1 style="font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">
                    ${title}
                </h1>
                <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                    Generated from DotCoder • ${new Date().toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                </p>
            </div>
            <div class="pdf-body" style="font-size: 14px; line-height: 1.8; color: #334155;">
                ${htmlContent}
            </div>
        </div>
    `;

    // Style overrides for PDF rendering (dark theme colors → print-friendly)
    const style = document.createElement('style');
    style.textContent = `
        .pdf-body * { color: #334155 !important; }
        .pdf-body h1, .pdf-body h2, .pdf-body h3 { 
            color: #1e293b !important; 
            margin-top: 16px;
            margin-bottom: 8px;
        }
        .pdf-body h1 { font-size: 22px; }
        .pdf-body h2 { font-size: 18px; }
        .pdf-body h3 { font-size: 16px; }
        .pdf-body p { margin-bottom: 8px; }
        .pdf-body ol, .pdf-body ul { 
            padding-left: 24px; 
            margin-bottom: 8px; 
        }
        .pdf-body ol > li { list-style-type: decimal !important; }
        .pdf-body ul > li { list-style-type: disc !important; }
        .pdf-body li { margin-bottom: 4px; }
        .pdf-body pre, .pdf-body .ql-code-block-container {
            background: #f1f5f9 !important;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            font-family: 'Fira Code', 'Consolas', monospace;
            font-size: 12px;
            overflow-wrap: break-word;
            white-space: pre-wrap;
        }
        .pdf-body code {
            background: #f1f5f9 !important;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Fira Code', 'Consolas', monospace;
            font-size: 12px;
        }
        .pdf-body a { color: #3b82f6 !important; text-decoration: underline; }
        .pdf-body strong, .pdf-body b { color: #0f172a !important; }
        .pdf-body u { text-decoration: underline; }
        .pdf-body s { text-decoration: line-through; }
        .pdf-body blockquote {
            border-left: 4px solid #3b82f6;
            padding-left: 16px;
            margin: 8px 0;
            color: #475569 !important;
        }
        .pdf-body img { max-width: 100%; height: auto; }
        /* Override any dark background highlights for print */
        .pdf-body [style*="background"] { 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    `;
    container.prepend(style);

    // Temporarily add to DOM for html2pdf to render
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width
    container.style.background = '#ffffff';
    document.body.appendChild(container);

    const opt = {
        margin: [10, 12, 10, 12], // top, left, bottom, right in mm
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            letterRendering: true,
            backgroundColor: '#ffffff'
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf()
        .set(opt)
        .from(container.querySelector('div'))
        .save()
        .then(() => {
            document.body.removeChild(container);
        })
        .catch((err) => {
            console.error('PDF generation failed:', err);
            document.body.removeChild(container);
        });
};

/**
 * Export a question's logic + code as PDF
 */
export const exportQuestionToPdf = (question) => {
    let html = '';
    
    if (question.logic?.content) {
        html += `<h2 style="color: #1e293b; margin-bottom: 12px;">Logic / Explanation</h2>`;
        html += question.logic.content;
    }
    
    if (question.code?.content) {
        html += `<h2 style="color: #1e293b; margin-top: 20px; margin-bottom: 12px;">Code (${question.code.language || 'cpp'})</h2>`;
        html += `<pre style="background: #f1f5f9; padding: 16px; border-radius: 8px; font-family: 'Fira Code', monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; border: 1px solid #e2e8f0;">${escapeHtml(question.code.content)}</pre>`;
    }

    if (!html) {
        alert('No content to export!');
        return;
    }

    const sanitizedTitle = question.title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    exportToPdf(html, question.title, sanitizedTitle || 'question');
};

/**
 * Export a cheatsheet item's content as PDF
 */
export const exportCheatsheetItemToPdf = (item, sheetTitle) => {
    if (!item.content) {
        alert('No content to export!');
        return;
    }

    let html = item.content;

    // Append links if present
    if (item.questionLinks) {
        html += `<h3 style="margin-top: 20px;">📝 Question Links</h3>`;
        html += formatLinksForPdf(item.questionLinks);
    }
    if (item.answerLinks) {
        html += `<h3 style="margin-top: 12px;">✅ Answer Links</h3>`;
        html += formatLinksForPdf(item.answerLinks);
    }

    const title = `${sheetTitle} — ${item.title}`;
    const sanitizedTitle = `${sheetTitle}_${item.title}`.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    exportToPdf(html, title, sanitizedTitle || 'cheatsheet');
};

function formatLinksForPdf(linksText) {
    const lines = linksText.split('\n').filter(l => l.trim());
    if (lines.length === 0) return '';
    return '<ul>' + lines.map(line => {
        const trimmed = line.trim();
        const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
        return `<li>${isUrl ? `<a href="${trimmed}">${trimmed}</a>` : trimmed}</li>`;
    }).join('') + '</ul>';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
