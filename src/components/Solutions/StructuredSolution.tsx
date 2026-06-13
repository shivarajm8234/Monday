import React, { useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

interface StructuredSolutionProps {
  content: string
}

const StructuredSolution: React.FC<StructuredSolutionProps> = ({ content }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  // Parse the structured content
  const parseStructuredContent = (text: string) => {
    const sections: { [key: string]: string } = {}
    
    // Split by section headers
    const sectionRegex = /=== ([^=]+) ===\n([\s\S]*?)(?=\n=== |$)/g
    let match
    
    while ((match = sectionRegex.exec(text)) !== null) {
      const sectionName = match[1].trim()
      const sectionContent = match[2].trim()
      sections[sectionName] = sectionContent
    }
    
    return sections
  }

  const sections = parseStructuredContent(content)

  // Copy function with exact formatting
  const copyToClipboard = async (text: string, sectionName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(sectionName)
      setTimeout(() => setCopiedSection(null), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const renderSection = (title: string, content: string) => {
    if (!content) return null

    const isPythonSection = title.toLowerCase().includes('python solution')
    const isCppSection = title.toLowerCase().includes('c++ solution')
    const isAnswerSection = title.toLowerCase().includes('correct answer') || title.toLowerCase().includes('answer')
    
    // Extract code from markdown blocks if present
    const extractCodeFromMarkdown = (text: string) => {
      const codeBlockRegex = /```(?:python|cpp)?\n([\s\S]*?)```/
      const match = text.match(codeBlockRegex)
      return match ? match[1].trim() : text
    }
    
    const codeContent = extractCodeFromMarkdown(content)
    const isCodeSection = isPythonSection || isCppSection
    
         return (
       <div key={title} className="mb-6">
                 <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-1">
           <h3 className="text-[14px] font-semibold text-white">
             {title}
           </h3>
          {isCodeSection && (
            <button
              onClick={() => copyToClipboard(codeContent, title)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                copiedSection === title
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {copiedSection === title ? '✓ Copied!' : '📋 Copy'}
            </button>
          )}
        </div>
        <div className="text-[13px] leading-[1.5] text-gray-100">
          {isPythonSection ? (
            <div className="relative">
              <SyntaxHighlighter
                showLineNumbers
                language="python"
                style={dracula}
                customStyle={{
                  maxWidth: "100%",
                  margin: 0,
                  padding: "1rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  fontSize: "12px",
                  lineHeight: "1.4"
                }}
                wrapLongLines={true}
              >
                {codeContent}
              </SyntaxHighlighter>
              <div className="absolute bottom-2 right-2">
                <button
                  onClick={() => copyToClipboard(codeContent, title)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    copiedSection === title
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {copiedSection === title ? '✓' : '📋'}
                </button>
              </div>
            </div>
          ) : isCppSection ? (
            <div className="relative">
              <SyntaxHighlighter
                showLineNumbers
                language="cpp"
                style={dracula}
                customStyle={{
                  maxWidth: "100%",
                  margin: 0,
                  padding: "1rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  fontSize: "12px",
                  lineHeight: "1.4"
                }}
                wrapLongLines={true}
              >
                {codeContent}
              </SyntaxHighlighter>
              <div className="absolute bottom-2 right-2">
                <button
                  onClick={() => copyToClipboard(codeContent, title)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    copiedSection === title
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {copiedSection === title ? '✓' : '📋'}
                </button>
              </div>
            </div>
                     ) : (
             <div className="whitespace-pre-wrap bg-gray-800/50 p-3 rounded-md">
               <div dangerouslySetInnerHTML={{ 
                 __html: content
                   .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                   .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>')
                   // Simple formatting for better visibility
                   .replace(/^(Answer:|Explanation:|Time:|Space:|BRIEF EXPLANATION:|ALTERNATIVE APPROACHES:)/gm, '<div class="font-bold text-sm mb-1 text-white">$1</div>')
               }} />
             </div>
           )}
        </div>
      </div>
    )
  }

  // If no structured sections found, display as regular content
  if (Object.keys(sections).length === 0) {
    return (
      <div className="text-[13px] leading-[1.5] text-gray-100 whitespace-pre-wrap bg-gray-800/50 p-3 rounded-md">
        {content}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(sections).map(([title, content]) => 
        renderSection(title, content)
      )}
    </div>
  )
}

export default StructuredSolution
