import React, { useState } from 'react';
import { ScanLine, ClipboardCopy, Download, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface HeadingInfo {
  level: number;
  text: string;
  element: Element;
  issues: string[];
}

function App() {
  const [url, setUrl] = useState<string>('');
  const [headings, setHeadings] = useState<HeadingInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string[]>([]);

  const analyzeHeadings = (doc: Document): { headingsInfo: HeadingInfo[], summary: string[] } => {
    const headingElements = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    const headingsInfo: HeadingInfo[] = [];
    const summary: string[] = [];
    let h1Count = 0;

    headingElements.forEach((h, index) => {
      const level = parseInt(h.tagName.substring(1), 10);
      const text = h.textContent?.trim() || '';
      const issues: string[] = [];

      if (level === 1) {
        h1Count++;
      }

      // Check for skipped levels (only if not the first heading)
      if (index > 0 && level > lastLevel + 1) {
        issues.push(`Skipped heading level: H${lastLevel} followed by H${level}.`);
      }

      // Check for non-sequential decrease (e.g., H4 followed by H2) - less common issue but possible
      // if (level < lastLevel && level !== lastLevel -1) {
      //   issues.push(`Incorrect heading order decrease: H${lastLevel} followed by H${level}.`);
      // }

      headingsInfo.push({ level, text, element: h, issues });
      lastLevel = level;
    });

    // Summary checks
    if (h1Count === 0) {
      summary.push('Error: No H1 tag found. Every page should have one H1.');
    } else if (h1Count > 1) {
      summary.push(`Warning: Multiple H1 tags found (${h1Count}). Best practice is to have only one H1 per page.`);
    } else {
       summary.push('Good: Exactly one H1 tag found.');
    }

    const skippedLevelIssue = headingsInfo.some(h => h.issues.some(issue => issue.startsWith('Skipped')));
    if (skippedLevelIssue) {
        summary.push('Issue: Heading levels are skipped (e.g., H1 followed directly by H3).');
    } else {
        summary.push('Good: Heading levels follow a logical sequence.');
    }


    return { headingsInfo, summary };
  };

  const handleFetchAndAnalyze = async () => {
    if (!url) {
      setError('Please enter a URL.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setHeadings([]);
    setAnalysisSummary([]);

    // Basic URL validation
    let formattedUrl = url;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
    }

    // Use a CORS proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(formattedUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const { headingsInfo, summary } = analyzeHeadings(doc);
      setHeadings(headingsInfo);
      setAnalysisSummary(summary);

    } catch (err) {
      console.error('Fetch or Parse Error:', err);
      setError(`Failed to fetch or parse the URL. Error: ${err instanceof Error ? err.message : String(err)}. This might be due to network issues, the website blocking requests, or the CORS proxy limitations.`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatResultsForExport = (): string => {
    let output = `Heading Structure Analysis for: ${url}\n`;
     output += "========================================\n\n";

    output += "Summary:\n";
    analysisSummary.forEach(item => output += `- ${item}\n`);
    output += "\n";

    output += "Headings Found:\n";
    headings.forEach(h => {
      output += `${'  '.repeat(h.level - 1)}H${h.level}: ${h.text}\n`;
      if (h.issues.length > 0) {
        h.issues.forEach(issue => output += `${'  '.repeat(h.level - 1)}  -> Issue: ${issue}\n`);
      }
    });
     output += "\n========================================\n";
    return output;
  };

  const handleCopyToClipboard = () => {
    const results = formatResultsForExport();
    navigator.clipboard.writeText(results)
      .then(() => alert('Results copied to clipboard!'))
      .catch(err => alert('Failed to copy results.'));
  };

  const handleExportToFile = () => {
    const results = formatResultsForExport();
    const blob = new Blob([results], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `heading_analysis_${url.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const getSummaryIcon = (item: string) => {
    if (item.startsWith('Error:') || item.startsWith('Issue:')) return <AlertTriangle className="inline-block mr-2 h-5 w-5 text-red-500" />;
    if (item.startsWith('Warning:')) return <Info className="inline-block mr-2 h-5 w-5 text-yellow-500" />;
    if (item.startsWith('Good:')) return <CheckCircle className="inline-block mr-2 h-5 w-5 text-green-500" />;
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex items-center mb-6">
            <ScanLine className="h-10 w-10 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">Heading Structure Analyzer</h1>
          </div>

          <p className="text-gray-600 mb-6">
            Enter a webpage URL to analyze its heading (H1-H6) structure for SEO and accessibility best practices.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
              disabled={isLoading}
            />
            <button
              onClick={handleFetchAndAnalyze}
              disabled={isLoading}
              className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <ScanLine className="h-5 w-5 mr-2" /> Analyze
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {(headings.length > 0 || analysisSummary.length > 0) && !isLoading && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">Analysis Results</h2>

              <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                 <h3 className="text-lg font-medium text-gray-800 mb-2">Summary</h3>
                 <ul className="space-y-1 text-gray-700">
                    {analysisSummary.map((item, index) => (
                        <li key={index} className="flex items-center">
                            {getSummaryIcon(item)}
                            {item}
                        </li>
                    ))}
                 </ul>
              </div>


              <div className="mb-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopyToClipboard}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                >
                  <ClipboardCopy className="h-4 w-4 mr-2" /> Copy Results
                </button>
                <button
                  onClick={handleExportToFile}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                >
                  <Download className="h-4 w-4 mr-2" /> Export as .txt
                </button>
              </div>

              <div className="prose max-w-none border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="text-lg font-medium text-gray-800 mb-3 !mt-0">Heading Outline</h3>
                {headings.length > 0 ? (
                  <ul className="list-none p-0 m-0 space-y-2">
                    {headings.map((h, index) => (
                      <li key={index} className={`pl-${(h.level - 1) * 4} border-l-2 ${h.issues.length > 0 ? 'border-red-400 bg-red-50' : 'border-gray-300'} p-2 rounded-r-md`}>
                        <span className={`font-semibold text-gray-800 ${h.level === 1 ? 'text-lg' : ''}`}>H{h.level}:</span>{' '}
                        <span className="text-gray-700">{h.text || <i className="text-gray-400">(empty)</i>}</span>
                        {h.issues.length > 0 && (
                          <div className="mt-1 pl-4 text-sm text-red-600">
                            {h.issues.map((issue, i) => (
                              <div key={i} className="flex items-start">
                                <AlertTriangle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                                <span>{issue}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No headings (H1-H6) found on the page.</p>
                )}
              </div>
               <p className="text-xs text-gray-500 mt-4">
                Note: Analysis is based on fetched HTML content. Dynamic content loaded via JavaScript after the initial page load might not be included. Fetching is done via a public proxy (api.allorigins.win) due to browser limitations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
