import React, { useState, useEffect, useRef } from "react"
import { useQueryClient } from "react-query"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"
import { ComplexitySection, ContentSection } from "./Solutions"
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastTitle,
  ToastVariant
} from "../components/ui/toast"
import { diffLines } from "diff"

type DiffLine = {
  value: string
  added?: boolean
  removed?: boolean
}

const CodeComparisonSection = ({
  oldCode,
  newCode,
  isLoading
}: {
  oldCode: string | null
  newCode: string | null
  isLoading: boolean
}) => {
  const computeDiff = () => {
    if (!oldCode || !newCode) return { leftLines: [], rightLines: [] }

    const normalizeCode = (code: string) => {
      return code
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim()
    }

    const normalizedOldCode = normalizeCode(oldCode)
    const normalizedNewCode = normalizeCode(newCode)

    const diff = diffLines(normalizedOldCode, normalizedNewCode, {
      newlineIsToken: true,
      ignoreWhitespace: true
    })

    const leftLines: DiffLine[] = []
    const rightLines: DiffLine[] = []

    diff.forEach((part) => {
      if (part.added) {
        leftLines.push(...Array(part.count || 0).fill({ value: "" }))
        rightLines.push(
          ...part.value
            .split("\n")
            .filter((line) => line.length > 0)
            .map((line) => ({
              value: line,
              added: true
            }))
        )
      } else if (part.removed) {
        leftLines.push(
          ...part.value
            .split("\n")
            .filter((line) => line.length > 0)
            .map((line) => ({
              value: line,
              removed: true
            }))
        )
        rightLines.push(...Array(part.count || 0).fill({ value: "" }))
      } else {
        const lines = part.value.split("\n").filter((line) => line.length > 0)
        leftLines.push(...lines.map((line) => ({ value: line })))
        rightLines.push(...lines.map((line) => ({ value: line })))
      }
    })

    return { leftLines, rightLines }
  }

  const { leftLines, rightLines } = computeDiff()

  return (
    <div className="space-y-1.5 font-mono">
      <h2 className="text-[13px] font-semibold text-green-500 tracking-wide">
        Code Comparison
      </h2>
      {isLoading ? (
        <div className="space-y-1">
          <div className="mt-3 flex">
            <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
              Loading code comparison...
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-2 bg-[#0c0c0c] border border-[#262626] overflow-hidden">
          {/* Previous Code */}
          <div className="w-1/2 border-r border-[#262626]">
            <div className="bg-[#121212] px-3 py-1 border-b border-[#262626]">
              <h3 className="text-[11px] font-semibold text-neutral-400">
                Previous Version
              </h3>
            </div>
            <div className="p-3 overflow-x-auto text-[11px]">
              <SyntaxHighlighter
                language="python"
                style={dracula}
                customStyle={{
                  maxWidth: "100%",
                  margin: 0,
                  padding: "0.5rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  fontSize: "11px",
                  background: "transparent"
                }}
                wrapLines={true}
                showLineNumbers={true}
                lineProps={(lineNumber) => {
                  const line = leftLines[lineNumber - 1]
                  return {
                    style: {
                      display: "block",
                      backgroundColor: line?.removed
                        ? "rgba(139, 0, 0, 0.2)"
                        : "transparent"
                    }
                  }
                }}
              >
                {leftLines.map((line) => line.value).join("\n")}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* New Code */}
          <div className="w-1/2">
            <div className="bg-[#121212] px-3 py-1 border-b border-[#262626]">
              <h3 className="text-[11px] font-semibold text-neutral-400">
                New Version
              </h3>
            </div>
            <div className="p-3 overflow-x-auto text-[11px]">
              <SyntaxHighlighter
                language="python"
                style={dracula}
                customStyle={{
                  maxWidth: "100%",
                  margin: 0,
                  padding: "0.5rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  fontSize: "11px",
                  background: "transparent"
                }}
                wrapLines={true}
                showLineNumbers={true}
                lineProps={(lineNumber) => {
                  const line = rightLines[lineNumber - 1]
                  return {
                    style: {
                      display: "block",
                      backgroundColor: line?.added
                        ? "rgba(0, 139, 0, 0.2)"
                        : "transparent"
                    }
                  }
                }}
              >
                {rightLines.map((line) => line.value).join("\n")}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface DebugProps {
  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void
}

const Debug: React.FC<DebugProps> = ({ isProcessing, setIsProcessing }) => {
  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  const [oldCode, setOldCode] = useState<string | null>(null)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [timeComplexityData, setTimeComplexityData] = useState<string | null>(
    null
  )
  const [spaceComplexityData, setSpaceComplexityData] = useState<string | null>(
    null
  )

  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  useEffect(() => {
    const newSolution = queryClient.getQueryData(["new_solution"]) as {
      old_code: string
      new_code: string
      thoughts: string[]
      time_complexity: string
      space_complexity: string
    } | null

    if (newSolution) {
      setOldCode(newSolution.old_code || null)
      setNewCode(newSolution.new_code || null)
      setThoughtsData(newSolution.thoughts || null)
      setTimeComplexityData(newSolution.time_complexity || null)
      setSpaceComplexityData(newSolution.space_complexity || null)
      setIsProcessing(false)
    }

    const cleanupFunctions = [
      window.electronAPI.onDebugSuccess(() => {
        setIsProcessing(false)
      }),
      window.electronAPI.onDebugStart(() => {
        setIsProcessing(true)
      }),
      window.electronAPI.onDebugError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error debugging your code.",
          "error"
        )
        setIsProcessing(false)
        console.error("Processing error:", error)
      })
    ]

    const updateDimensions = () => {
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [queryClient, setIsProcessing])

  return (
    <div ref={contentRef} className="bg-transparent p-1 select-text">
      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        variant={toastMessage.variant}
        duration={3000}
      >
        <ToastTitle>{toastMessage.title}</ToastTitle>
        <ToastDescription>{toastMessage.description}</ToastDescription>
      </Toast>

      <div className="bg-[#0a0a0a] border border-[#262626] text-gray-200 font-mono text-xs p-4 w-[640px] rounded-none shadow-2xl flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-[#262626] pb-2 text-green-500">
          <span>&gt; wingman_ai --output debug</span>
          <span className="text-neutral-500 text-[10px] uppercase tracking-wider">
            Ctrl+B: HIDE | Ctrl+L: RE-CAPTURE
          </span>
        </div>

        <div className="overflow-hidden space-y-4">
          {/* Thoughts Section */}
          <ContentSection
            title="What I Changed"
            content={
              thoughtsData && (
                <div className="space-y-1">
                  {thoughtsData.map((thought, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-none bg-blue-500 mt-1.5 shrink-0" />
                      <div>{thought}</div>
                    </div>
                  ))}
                </div>
              )
            }
            isLoading={!thoughtsData}
          />

          {/* Code Comparison Section */}
          <CodeComparisonSection
            oldCode={oldCode}
            newCode={newCode}
            isLoading={!oldCode || !newCode}
          />

          {/* Complexity Section */}
          <ComplexitySection
            timeComplexity={timeComplexityData}
            spaceComplexity={spaceComplexityData}
            isLoading={!timeComplexityData || !spaceComplexityData}
          />
        </div>
      </div>
    </div>
  )
}

export default Debug
