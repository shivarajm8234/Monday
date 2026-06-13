import React, { useState, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "react-query"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant,
  ToastMessage
} from "../components/ui/toast"
import { ProblemStatementData } from "../types/solutions"
import { AudioResult } from "../types/audio"
import StructuredSolution from "../components/Solutions/StructuredSolution"
import Debug from "./Debug"

export const ContentSection = ({
  title,
  content,
  isLoading
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
}) => {
  const isStructuredContent = typeof content === "string" && content.includes("=== PYTHON SOLUTION ===")

  return (
    <div className="space-y-2">
      <h2 className="text-[13px] font-semibold text-green-500 tracking-wide">
        {title}
      </h2>
      {isLoading ? (
        <div className="flex">
          <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
            Loading...
          </p>
        </div>
      ) : (
        <div className="text-[13px] leading-[1.4] text-gray-200 max-w-[600px] font-mono">
          {isStructuredContent ? (
            <StructuredSolution content={content as string} />
          ) : (
            content
          )}
        </div>
      )}
    </div>
  )
}

export const SolutionSection = ({
  title,
  content,
  isLoading
}: {
  title: string
  content: string | null
  isLoading: boolean
}) => {
  return (
    <div className="space-y-2">
      <h2 className="text-[13px] font-semibold text-green-500 tracking-wide">
        {title}
      </h2>
      {isLoading ? (
        <div className="flex">
          <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
            Generating solution...
          </p>
        </div>
      ) : (
        content && (
          <div className="text-[13px] leading-[1.4] text-gray-200 font-mono">
            <StructuredSolution content={content} />
          </div>
        )
      )}
    </div>
  )
}

export const ComplexitySection = ({
  timeComplexity,
  spaceComplexity,
  isLoading
}: {
  timeComplexity: string | null
  spaceComplexity: string | null
  isLoading: boolean
}) => {
  return (
    <div className="space-y-2 border-t border-[#262626] pt-3">
      <h2 className="text-[13px] font-semibold text-green-500 tracking-wide">
        Complexity
      </h2>
      {isLoading ? (
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          Analyzing complexity...
        </p>
      ) : (
        <div className="flex gap-4 text-xs text-neutral-400 font-mono">
          <div>
            Time Complexity:{" "}
            <span className="text-white font-medium">{timeComplexity}</span>
          </div>
          <div>
            Space Complexity:{" "}
            <span className="text-white font-medium">{spaceComplexity}</span>
          </div>
        </div>
      )}
    </div>
  )
}

interface SolutionsProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>
}

const Solutions: React.FC<SolutionsProps> = ({ setView }) => {
  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  const [problemStatementData, setProblemStatementData] =
    useState<ProblemStatementData | null>(null)
  const [solutionData, setSolutionData] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [timeComplexityData, setTimeComplexityData] = useState<string | null>(
    null
  )
  const [spaceComplexityData, setSpaceComplexityData] = useState<string | null>(
    null
  )

  const [, setAudioRecording] = useState(false)
  const [, setAudioResult] = useState<AudioResult | null>(null)
  const [, setCustomContent] = useState<string | null>(null)
  const [debugProcessing, setDebugProcessing] = useState(false)

  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const [isResetting, setIsResetting] = useState(false)

  const { refetch } = useQuery<Array<{ path: string; preview: string }>, Error>(
    ["extras"],
    async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading extra screenshots:", error)
        return []
      }
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity
    }
  )

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  useEffect(() => {
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

    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => {
        setIsResetting(true)
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["new_solution"])
        refetch()
        setTimeout(() => {
          setIsResetting(false)
        }, 0)
      }),
      window.electronAPI.onSolutionStart(async () => {
        setSolutionData(null)
        setThoughtsData(null)
        setTimeComplexityData(null)
        setSpaceComplexityData(null)
        setCustomContent(null)
        setAudioResult(null)

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          const mediaRecorder = new MediaRecorder(stream)
          const chunks: Blob[] = []
          mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
          mediaRecorder.start()
          setAudioRecording(true)
          setTimeout(() => mediaRecorder.stop(), 5000)
          mediaRecorder.onstop = async () => {
            setAudioRecording(false)
            const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" })
            const reader = new FileReader()
            reader.onloadend = async () => {
              const base64Data = (reader.result as string).split(",")[1]
              try {
                const result = await window.electronAPI.analyzeAudioFromBase64(
                  base64Data,
                  blob.type
                )
                queryClient.setQueryData(["audio_result"], result)
                setAudioResult(result)
                showToast("Audio Processed", "Audio clip analyzed successfully", "success")
              } catch (err) {
                showToast("Audio Analysis Failed", "Failed to analyze audio clip", "error")
                console.error("Audio recording error:", err)
              }
            }
            reader.readAsDataURL(blob)
          }
        } catch (err) {
          console.error("Audio recording error:", err)
        }

        setTimeout(() => {
          setCustomContent(
            "This is the dynamically generated content appearing after loading starts."
          )
        }, 1500)
      }),
      window.electronAPI.onSolutionError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your solution.",
          "error"
        )
        const solution = queryClient.getQueryData(["solution"]) as {
          code: string
          thoughts: string[]
          time_complexity: string
          space_complexity: string
        } | null
        if (!solution) {
          setView("queue")
        }
        setSolutionData(solution?.code || null)
        setThoughtsData(solution?.thoughts || null)
        setTimeComplexityData(solution?.time_complexity || null)
        setSpaceComplexityData(solution?.space_complexity || null)
        console.error("Processing error:", error)
      }),
      window.electronAPI.onSolutionSuccess((data) => {
        if (!data?.solution) {
          console.warn("Received empty or invalid solution data")
          return
        }

        const solutionDataVal = {
          code: data.solution.code,
          thoughts: data.solution.thoughts,
          time_complexity: data.solution.time_complexity,
          space_complexity: data.solution.space_complexity
        }

        queryClient.setQueryData(["solution"], solutionDataVal)
        setSolutionData(solutionDataVal.code || null)
        setThoughtsData(solutionDataVal.thoughts || null)
        setTimeComplexityData(solutionDataVal.time_complexity || null)
        setSpaceComplexityData(solutionDataVal.space_complexity || null)
      }),
      window.electronAPI.onDebugStart(() => {
        setDebugProcessing(true)
      }),
      window.electronAPI.onDebugSuccess((data) => {
        queryClient.setQueryData(["new_solution"], data.solution)
        setDebugProcessing(false)
      }),
      window.electronAPI.onDebugError(() => {
        showToast(
          "Processing Failed",
          "There was an error debugging your code.",
          "error"
        )
        setDebugProcessing(false)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no extra screenshots to process.",
          "neutral"
        )
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [queryClient, setView])

  useEffect(() => {
    setProblemStatementData(
      queryClient.getQueryData(["problem_statement"]) || null
    )
    setSolutionData(queryClient.getQueryData(["solution"]) || null)

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === "problem_statement") {
        setProblemStatementData(
          queryClient.getQueryData(["problem_statement"]) || null
        )
        const audioResultVal = queryClient.getQueryData(["audio_result"]) as AudioResult | undefined
        if (audioResultVal) {
          setProblemStatementData({
            problem_statement: audioResultVal.text,
            input_format: {
              description: "Generated from audio input",
              parameters: []
            },
            output_format: {
              description: "Generated from audio input",
              type: "string",
              subtype: "text"
            },
            complexity: {
              time: "N/A",
              space: "N/A"
            },
            test_cases: [],
            validation_type: "manual",
            difficulty: "custom"
          })
          setSolutionData(null)
          setThoughtsData(null)
          setTimeComplexityData(null)
          setSpaceComplexityData(null)
        }
      }
      if (event?.query.queryKey[0] === "solution") {
        const solution = queryClient.getQueryData(["solution"]) as {
          code: string
          thoughts: string[]
          time_complexity: string
          space_complexity: string
        } | null

        setSolutionData(solution?.code ?? null)
        setThoughtsData(solution?.thoughts ?? null)
        setTimeComplexityData(solution?.time_complexity ?? null)
        setSpaceComplexityData(solution?.space_complexity ?? null)
      }
    })
    return () => unsubscribe()
  }, [queryClient])

  return (
    <>
      {!isResetting && queryClient.getQueryData(["new_solution"]) ? (
        <Debug
          isProcessing={debugProcessing}
          setIsProcessing={setDebugProcessing}
        />
      ) : (
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

          {!problemStatementData ? (
            <div className="bg-[#0a0a0a] border border-[#262626] text-[#00ff00] font-mono text-xs p-4 w-[280px] h-[90px] flex flex-col justify-between rounded-none shadow-2xl">
              <div className="flex justify-between items-center">
                <span>&gt; wingman_ai --status solving</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="text-neutral-500 text-[10px] uppercase tracking-wider">
                Generating code...
              </div>
            </div>
          ) : (
            <div className="bg-[#0a0a0a] border border-[#262626] text-gray-200 font-mono text-xs p-4 w-[640px] rounded-none shadow-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-[#262626] pb-2 text-green-500">
                <span>&gt; wingman_ai --output solution</span>
                <span className="text-neutral-500 text-[10px] uppercase tracking-wider">
                  Ctrl+B: HIDE | Ctrl+L: RE-CAPTURE
                </span>
              </div>
              <div className="overflow-hidden">
                {problemStatementData.validation_type === "manual" ? (
                  <ContentSection
                    title={problemStatementData?.output_format?.subtype === "voice" ? "Audio Result" : "Screenshot Result"}
                    content={problemStatementData.problem_statement}
                    isLoading={false}
                  />
                ) : (
                  <div className="space-y-4">
                    <ContentSection
                      title={problemStatementData?.output_format?.subtype === "voice" ? "Voice Input" : "Problem Statement"}
                      content={problemStatementData?.problem_statement}
                      isLoading={false}
                    />
                    {solutionData && (
                      <>
                        <ContentSection
                          title="Analysis"
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
                          isLoading={false}
                        />
                        <SolutionSection
                          title={problemStatementData?.output_format?.subtype === "voice" ? "Response" : "Solution"}
                          content={solutionData}
                          isLoading={false}
                        />
                        {problemStatementData?.output_format?.subtype !== "voice" && (
                          <ComplexitySection
                            timeComplexity={timeComplexityData}
                            spaceComplexity={spaceComplexityData}
                            isLoading={false}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default Solutions
