// /app/widget/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BotMessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string | React.ReactNode;
}

interface Document {
  id: string;
  url: string;
  similarity: string;
}

interface Citation {
  start: number;
  end: number;
  text: string;
  documentIds: string[];
  documentUrl: string;
}

type ColorMap = { [key: string]: { base: string; hover: string } };

export default function ChatWidgetPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Welcome to OpenDocuChat!" },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [colorMapping, setColorMapping] = useState<ColorMap>({});
  const [chatId, setChatId] = useState("");
  const [colorSchemeReady, setColorSchemeReady] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);

  const toggleShowAllSources = () => {
    setShowAllSources(!showAllSources);
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleColorSchemeChange = (event: MessageEvent) => {
      if (event.data.type === "COLOR_SCHEME_UPDATE") {
        if (event.data.colorScheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        setColorSchemeReady(true);
      }
    };

    window.addEventListener("message", handleColorSchemeChange);

    window.parent.postMessage({ type: "REQUEST_COLOR_SCHEME" }, "*");

    timeoutId = setTimeout(() => {
      setColorSchemeReady(true);
    }, 300);

    return () => {
      window.removeEventListener("message", handleColorSchemeChange);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const warmupAPI = async () => {
      try {
        await fetch("/api/warmup", { method: "GET" });
      } catch (error) {
        console.error("Error calling warmup API:", error);
      }
    };

    warmupAPI();
  }, []);

  useEffect(() => {
    const updateIframeSize = () => {
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: "RESIZE_CHAT_WIDGET",
            width: isOpen ? "500px" : "68px",
            height: isOpen ? "750px" : "68px",
            isOpen: isOpen,
          },
          "*"
        );
      }
    };

    updateIframeSize();
    window.addEventListener("resize", updateIframeSize);
    return () => window.removeEventListener("resize", updateIframeSize);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resetChat = () => {
    setMessages([{ role: "assistant", content: "Welcome to OpenDocuChat!" }]);
    setDocuments([]);
    setCitations([]);
    setColorMapping({});
    setChatId("");
    setShowAllSources(false);
  };

  const createColorMapping = (docs: Document[]): ColorMap => {
    const colors = [
      {
        base: "bg-cyan-200 dark:bg-cyan-800",
        hover:
          "hover:bg-cyan-400 dark:hover:bg-cyan-700 hover:saturate-150 hover:contrast-125",
      },
      {
        base: "bg-lime-200 dark:bg-lime-800",
        hover:
          "hover:bg-lime-300 dark:hover:bg-lime-700 hover:saturate-150 hover:contrast-125",
      },
      {
        base: "bg-amber-200 dark:bg-amber-800",
        hover:
          "hover:bg-amber-300 dark:hover:bg-amber-700 hover:saturate-150 hover:contrast-125",
      },
    ];
    const defaultColor = {
      base: "bg-teal-100 dark:bg-teal-800",
      hover: "hover:bg-teal-300 dark:hover:bg-teal-700",
    };
    const alternateColor = {
      base: "bg-sky-100 dark:bg-sky-800",
      hover: "hover:bg-sky-300 dark:hover:bg-sky-700",
    };

    const newColorMapping: ColorMap = {};
    docs.forEach((doc, index) => {
      if (index < 3) {
        newColorMapping[doc.id] = colors[index];
      } else {
        newColorMapping[doc.id] =
          index % 2 === 0 ? defaultColor : alternateColor;
      }
    });
    return newColorMapping;
  };

  const highlightText = (
    text: string,
    messageCitations: Citation[],
    colorMap: ColorMap
  ) => {
    if (!messageCitations?.length) return text;

    const sortedCitations = messageCitations.sort((a, b) => b.start - a.start);
    let segments: {
      text: string;
      isHighlight: boolean;
      color?: { base: string; hover: string };
      documentId?: string;
      documentUrl?: string;
      citationIndex?: number;
    }[] = [{ text, isHighlight: false }];

    sortedCitations.forEach((citation, index) => {
      const documentId = citation.documentIds[0];
      const color = colorMap[documentId] || {
        base: "bg-gray-200",
        hover: "hover:bg-gray-300 hover:saturate-150 hover:contrast-125",
      };
      const segmentIndex = segments.findIndex(
        (segment) =>
          !segment.isHighlight && segment.text.includes(citation.text)
      );

      if (segmentIndex !== -1) {
        const segment = segments[segmentIndex];
        const startInSegment = segment.text.indexOf(citation.text);
        const endInSegment = startInSegment + citation.text.length;
        segments.splice(
          segmentIndex,
          1,
          { text: segment.text.slice(0, startInSegment), isHighlight: false },
          {
            text: citation.text,
            isHighlight: true,
            color,
            documentId,
            documentUrl: citation.documentUrl,
            citationIndex: index,
          },
          { text: segment.text.slice(endInSegment), isHighlight: false }
        );
      }
    });

    return segments
      .map((segment) =>
        segment.isHighlight
          ? `<a href="${segment.documentUrl}" target="_parent" class="highlight ${segment.color?.base} ${segment.color?.hover} cursor-pointer" data-document-id="${segment.documentId}" data-citation-index="${segment.citationIndex}">${segment.text}</a>`
          : segment.text
      )
      .join("");
  };

  useEffect(() => {
    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target && "classList" in target) {
        const documentItem = target.closest(".document-item") as HTMLElement;
        const highlightSpan = target.closest(".highlight") as HTMLElement;
        if (documentItem) {
          const documentId = documentItem.getAttribute("data-document-id");
          if (documentId) {
            highlightRelatedElements(documentId);
          }
        } else if (highlightSpan) {
          const documentId = highlightSpan.getAttribute("data-document-id");
          if (documentId) {
            highlightRelatedElements(documentId);
          }
        }
      }
    };

    const handleMouseLeave = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target && "classList" in target) {
        const documentItem = target.closest(".document-item") as HTMLElement;
        const highlightSpan = target.closest(".highlight") as HTMLElement;
        if (documentItem) {
          const documentId = documentItem.getAttribute("data-document-id");
          if (documentId) {
            unhighlightRelatedElements(documentId);
          }
        } else if (highlightSpan) {
          const documentId = highlightSpan.getAttribute("data-document-id");
          if (documentId) {
            unhighlightRelatedElements(documentId);
          }
        }
      }
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target && "classList" in target) {
        const documentItem = target.closest(".document-item") as HTMLElement;
        if (documentItem) {
          const documentId = documentItem?.getAttribute("data-document-id");
          if (documentId) {
            const document = documents.find((d) => d.id === documentId);
            if (document) {
              window.open(document.url, "_parent");
            }
          }
        }
      }
    };

    const highlightRelatedElements = (documentId: string) => {
      const relatedElements = document.querySelectorAll(
        `[data-document-id="${documentId}"]`
      );
      relatedElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.filter = "contrast(0.8) saturate(6)";
        }
      });
    };

    const unhighlightRelatedElements = (documentId: string) => {
      const relatedElements = document.querySelectorAll(
        `[data-document-id="${documentId}"]`
      );
      relatedElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.filter = "";
        }
      });
    };

    document.addEventListener("mouseover", handleMouseEnter);
    document.addEventListener("mouseout", handleMouseLeave);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("mouseover", handleMouseEnter);
      document.removeEventListener("mouseout", handleMouseLeave);
      document.removeEventListener("click", handleClick);
    };
  }, [documents]);

  const formatLLMResponse = (
    text: string,
    messageCitations: Citation[],
    colorMap: ColorMap
  ) => {
    text = highlightText(text, messageCitations, colorMap);
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    let inList = false;
    text = text
      .split("\n")
      .map((line) => {
        if (line.trim().startsWith("- ")) {
          if (!inList) {
            inList = true;
            return (
              '<ul class="list-disc pl-5"><li>' +
              line.trim().substring(2) +
              "</li>"
            );
          } else {
            return "<li>" + line.trim().substring(2) + "</li>";
          }
        } else {
          if (inList) {
            inList = false;
            return "</ul>" + line;
          } else {
            return line;
          }
        }
      })
      .join("\n");
    if (inList) text += "</ul>";
    return text;
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;
    setMessages((prev) => [...prev, { role: "user", content: inputMessage }]);
    setDocuments([]);
    setInputMessage("");
    setIsLoading(true);
    setShowSkeleton(true);

    try {
      const chatIdResponse = await fetch("/api/chat/create", {
        method: "POST",
      });
      const chatIdData = await chatIdResponse.json();
      setChatId(chatIdData.chatId);

      const response = await fetch(`/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          chatId: chatIdData.chatId,
        }),
      });

      // const response = await fetch(
      //   `/api/chat?message=${encodeURIComponent(inputMessage)}&chatId=${
      //     chatIdData.chatId
      //   }`,
      //   {
      //     method: "POST",
      //   }
      // );

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let assistantMessage = "";
      const textDecoder = new TextDecoder();
      let buffer = "";
      let currentCitations: Citation[] = [];
      let currentDocuments: Document[] = [];
      let currentColorMapping: ColorMap = {};
      let isFirstChunk = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += textDecoder.decode(value, { stream: true });

        let startIndex = 0;
        let endIndex;

        while ((endIndex = buffer.indexOf("\n", startIndex)) >= 0) {
          const line = buffer.slice(startIndex, endIndex);
          startIndex = endIndex + 1;

          if (line.trim().length > 0) {
            try {
              const event = JSON.parse(line);
              if (event.object === "chat.completion.chunk") {
                if (isFirstChunk) {
                  setShowSkeleton(false);
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: "" },
                  ]);
                  isFirstChunk = false;
                }
                for (const choice of event.choices) {
                  if (choice.delta) {
                    assistantMessage += choice.delta.content;
                  }
                  if (choice.finish_reason === "stop") {
                    break;
                  }
                }
                const formattedContent = formatLLMResponse(
                  assistantMessage,
                  currentCitations,
                  currentColorMapping
                );
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  { role: "assistant", content: formattedContent },
                ]);
              } else if (event.eventType === "documents") {
                currentDocuments = event.documents;
                setDocuments(currentDocuments);
                const newColorMapping = createColorMapping(currentDocuments);
                setColorMapping(newColorMapping);
                currentColorMapping = newColorMapping;
              } else if (event.eventType === "citation-generation") {
                const newCitations = event.citations.map(
                  (citation: Citation) => {
                    const document = currentDocuments.find(
                      (doc) => doc.id === citation.documentIds[0]
                    );
                    return {
                      ...citation,
                      documentUrl: document ? document.url : "",
                    };
                  }
                );
                currentCitations = [...currentCitations, ...newCitations];
                setCitations(currentCitations);
                const formattedContent = formatLLMResponse(
                  assistantMessage,
                  currentCitations,
                  currentColorMapping
                );
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  { role: "assistant", content: formattedContent },
                ]);
              }
            } catch (error) {
              console.error("Error parsing JSON:", error, "Line:", line);
            }
          }
        }

        buffer = buffer.slice(startIndex);
      }

      // const response = await fetch(
      //   `/api/chat?message=${encodeURIComponent(inputMessage)}&chatId=${chatIdData.chatId}`,
      //   {
      //     method: "POST",
      //   }
      // )

      // if (!response.ok) throw new Error("Failed to get response")

      // const reader = response.body?.getReader()
      // if (!reader) throw new Error("No response body")

      // let assistantMessage = ""
      // const textDecoder = new TextDecoder()
      // let buffer = ""
      // let currentCitations: Citation[] = []
      // let currentDocuments: Document[] = []
      // let currentColorMapping: ColorMap = {}
      // let isFirstChunk = true

      // while (true) {
      //   const { value, done } = await reader.read()
      //   if (done) break

      //   buffer += textDecoder.decode(value, { stream: true })

      //   let startIndex = 0
      //   let endIndex

      //   while ((endIndex = buffer.indexOf("\n", startIndex)) >= 0) {
      //     const line = buffer.slice(startIndex, endIndex)
      //     startIndex = endIndex + 1

      //     if (line.trim().length > 0) {
      //       try {
      //         const event = JSON.parse(line)
      //         if (event.eventType === "documents") {
      //           currentDocuments = event.documents
      //           setDocuments(currentDocuments)
      //           const newColorMapping = createColorMapping(currentDocuments)
      //           setColorMapping(newColorMapping)
      //           currentColorMapping = newColorMapping
      //         } else if (event.eventType === "text-generation") {
      //           if (isFirstChunk) {
      //             setShowSkeleton(false)
      //             setMessages((prev) => [...prev, { role: "assistant", content: "" }])
      //             isFirstChunk = false
      //           }
      //           assistantMessage += event.text
      //           const formattedContent = formatLLMResponse(assistantMessage, currentCitations, currentColorMapping)
      //           setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: formattedContent }])
      //         } else if (event.eventType === "citation-generation") {
      //           const newCitations = event.citations.map((citation: Citation) => {
      //             const document = currentDocuments.find((doc) => doc.id === citation.documentIds[0])
      //             return {
      //               ...citation,
      //               documentUrl: document ? document.url : "",
      //             }
      //           })
      //           currentCitations = [...currentCitations, ...newCitations]
      //           setCitations(currentCitations)
      //           const formattedContent = formatLLMResponse(assistantMessage, currentCitations, currentColorMapping)
      //           setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: formattedContent }])
      //         }
      //       } catch (error) {
      //         console.error("Error parsing JSON:", error, "Line:", line)
      //       }
      //     }
      //   }

      //   buffer = buffer.slice(startIndex)
      // }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setShowSkeleton(false);
    }
  };

  const urlToBreadcrumb = (url: string) => {
    const thirdSlashIndex = url.indexOf(
      "/",
      url.indexOf("/", url.indexOf("/") + 1) + 1
    );
    if (thirdSlashIndex === -1) return url;
    const path = url.slice(thirdSlashIndex + 1);
    if (path === "") return "Home";
    const segments = path
      .split("/")
      .filter((segment) => segment.length > 0)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));
    return segments.join(" > ");
  };

  const LoadingSkeleton = () => (
    <div className="animate-pulse flex space-x-4 mb-4">
      <div className="flex-1 space-y-3 py-1">
        <div className="h-3 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-5/6"></div>
        <div className="h-3 bg-gray-300 rounded w-2/3"></div>
      </div>
    </div>
  );

  const AdvancedHealthBar = ({
    score,
    method = "logistic",
  }: {
    score: number;
    method?: string;
  }) => {
    const clampedScore = Math.max(0, Math.min(score, 100));

    const scaleMethods = {
      linear: (s: number) => s,
      exponential: (s: number) => Math.pow(s / 100, 2) * 100,
      logistic: (s: number) => 100 / (1 + Math.exp(-0.1 * (s - 50))),
      power: (s: number) => Math.pow(s / 100, 3) * 100,
      percentile: (s: number) => {
        return ((s - 40) / (80 - 40)) * 100;
      },
      minMaxNorm: (s: number) => {
        return ((s - 40) / (80 - 40)) * 100;
      },
    };

    const scaledScore =
      scaleMethods[method as keyof typeof scaleMethods](clampedScore);

    return (
      <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-300 to-orange-600 transition-all"
          style={{ width: `${scaledScore}%` }}
        />
      </div>
    );
  };

  if (!colorSchemeReady) {
    return (
      <div className="w-[68px] h-[68px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full transition-all duration-300">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-0 right-0 font-bold w-screen h-screen 
                 bg-orange-600  
                 hover:bg-orange-700
                 transition-colors duration-500 ease-in-out"
      >
        <div className="flex flex-col items-center justify-center text-white dark:text-black">
          <BotMessageSquare className="" />
          Ask AI
        </div>
      </Button>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-white dark:bg-gray-800 rounded-lg">
      <div className="flex-shrink-0 flex justify-between items-center p-4 border-b dark:border-slate-700">
        <h2 className="text-lg font-semibold">OpenDocuChat</h2>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-3 px-2 w-full"
            onClick={resetChat}
            title="New chat"
          >
            {/* <RefreshCw className="h-4 w-4" /> */}
            New Chat
          </Button>
          <Button
            className="font-bold"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            X
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 ${
              msg.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <span
              className={`inline-block p-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-orange-600 text-white"
                  : "bg-slate-200 dark:bg-gray-700"
              }`}
            >
              {typeof msg.content === "string" ? (
                <span dangerouslySetInnerHTML={{ __html: msg.content }} />
              ) : (
                msg.content
              )}
            </span>
          </div>
        ))}
        {showSkeleton && <LoadingSkeleton />}
        <div ref={messagesEndRef} />

        {documents.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Sources
            </h3>
            <ul className="text-xs space-y-2">
              {documents
                .slice(0, showAllSources ? undefined : 3)
                .map((doc, index) => (
                  <li
                    key={doc.id}
                    className={`document-item p-2 rounded flex justify-between ${
                      colorMapping[doc.id].base
                    } ${
                      colorMapping[doc.id].hover
                    } cursor-pointer transition-colors duration-200`}
                    data-document-id={doc.id}
                  >
                    <span className="text-slate-700 dark:text-slate-200 font-semibold text-left">
                      {urlToBreadcrumb(doc.url)}
                    </span>
                    {/* <span className="text-slate-700 font-semibold text-right">({doc.similarity})</span> */}
                    {/* <div className="w-16"><AdvancedHealthBar score={parseInt(doc.similarity)} /></div> */}
                  </li>
                ))}
            </ul>
            {documents.length > 3 && (
              <button
                className="mt-2 px-3 py-1 text-xs font-medium rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 flex items-center justify-center w-full"
                onClick={toggleShowAllSources}
              >
                {showAllSources ? (
                  <>
                    <ChevronUp className="mr-1 h-3 w-3" />
                    Fewer Sources
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-3 w-3" />
                    More Sources
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-100 dark:bg-gray-900 flex-shrink-0 p-4 border-t dark:border-slate-700 flex ">
        <Input
          placeholder="Type your message..."
          className="flex-grow mr-4"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          style={{ fontSize: "16px" }}
        />
        <Button onClick={handleSendMessage} disabled={isLoading}>
          {isLoading ? (
            <div style={{ display: "inline-flex", alignItems: "center" }}>
              {showSkeleton ? "Analysing" : "Responding"}
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            </div>
          ) : (
            "Send"
          )}
        </Button>
      </div>
    </div>
  );
}
