// /app/widget/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { IconPaperAirplane } from "@/components/ui/icon-paper-airplane";
import { IconXMark } from "@/components/ui/icon-x-mark";

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
  const [citedDocuments, setCitedDocuments] = useState<Document[]>([]);

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

  // useEffect(() => {
  //   const warmupAPI = async () => {
  //     try {
  //       await fetch("/api/warmup", { method: "GET" });
  //     } catch (error) {
  //       console.error("Error calling warmup API:", error);
  //     }
  //   };

  //   warmupAPI();
  // }, []);

  useEffect(() => {
    const updateIframeSize = () => {
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: "RESIZE_CHAT_WIDGET",
            width: isOpen ? "500px" : "48px",
            height: isOpen ? "750px" : "48px",
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

  // const highlightText = (
  //   text: string,
  //   messageCitations: Citation[],
  //   colorMap: ColorMap
  // ) => {
  //   if (!messageCitations?.length) return text;

  //   const sortedCitations = messageCitations.sort((a, b) => b.start - a.start);
  //   let segments: {
  //     text: string;
  //     isHighlight: boolean;
  //     color?: { base: string; hover: string };
  //     documentId?: string;
  //     documentUrl?: string;
  //     citationIndex?: number;
  //   }[] = [{ text, isHighlight: false }];

  //   sortedCitations.forEach((citation, index) => {
  //     const documentId = citation.documentIds[0];
  //     const color = colorMap[documentId] || {
  //       base: "bg-gray-200",
  //       hover: "hover:bg-gray-300 hover:saturate-150 hover:contrast-125",
  //     };
  //     const segmentIndex = segments.findIndex(
  //       (segment) =>
  //         !segment.isHighlight && segment.text.includes(citation.text)
  //     );

  //     if (segmentIndex !== -1) {
  //       const segment = segments[segmentIndex];
  //       const startInSegment = segment.text.indexOf(citation.text);
  //       const endInSegment = startInSegment + citation.text.length;
  //       segments.splice(
  //         segmentIndex,
  //         1,
  //         { text: segment.text.slice(0, startInSegment), isHighlight: false },
  //         {
  //           text: citation.text,
  //           isHighlight: true,
  //           color,
  //           documentId,
  //           documentUrl: citation.documentUrl,
  //           citationIndex: index,
  //         },
  //         { text: segment.text.slice(endInSegment), isHighlight: false }
  //       );
  //     }
  //   });

  //   return segments
  //     .map((segment) =>
  //       segment.isHighlight
  //         ? `<a href="${segment.documentUrl}" target="_parent" class="highlight ${segment.color?.base} ${segment.color?.hover} cursor-pointer" data-document-id="${segment.documentId}" data-citation-index="${segment.citationIndex}">${segment.text}</a>`
  //         : segment.text
  //     )
  //     .join("");
  // };

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
    colorMap: ColorMap,
    currentDocuments: Document[]
  ) => {
    let citedDocs: Document[] = [];

    let formattedText = text.replace(/\[source: (\d+)\]/g, (_, id) => {
      const index = currentDocuments.findIndex((doc) => doc.id === id);
      if (index !== -1) {
        const color = colorMap[id] || {
          base: "bg-gray-200",
          hover: "hover:bg-gray-300",
        };
        if (!citedDocs.some((doc) => doc.id === id)) {
          citedDocs.push(currentDocuments[index]);
        }
        return `<span class="citation-mark cursor-pointer ${color.base} ${color.hover} px-1 rounded" data-document-id="${id}">[${citedDocs.length}]</span>`;
      }
      return "";
    });

    setCitedDocuments(citedDocs);

    formattedText = formattedText.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );
    let inList = false;
    formattedText = formattedText
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
    if (inList) formattedText += "</ul>";
    return formattedText;
  };

  useEffect(() => {
    const handleCitationClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target && target.classList.contains("citation-mark")) {
        const documentId = target.getAttribute("data-document-id");
        if (documentId) {
          highlightRelatedElements(documentId);
          setTimeout(() => unhighlightRelatedElements(documentId), 2000);
        }
      }
    };

    document.addEventListener("click", handleCitationClick);

    return () => {
      document.removeEventListener("click", handleCitationClick);
    };
  }, []);

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

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;
    setMessages((prev) => [...prev, { role: "user", content: inputMessage }]);
    setDocuments([]);
    setCitedDocuments([]);
    setColorMapping({});
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
                  currentColorMapping,
                  currentDocuments
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
              }
              // else if (event.eventType === "citation-generation") {
              //   const newCitations = event.citations.map(
              //     (citation: Citation) => {
              //       const document = currentDocuments.find(
              //         (doc) => doc.id === citation.documentIds[0]
              //       );
              //       return {
              //         ...citation,
              //         documentUrl: document ? document.url : "",
              //       };
              //     }
              //   );
              //   currentCitations = [...currentCitations, ...newCitations];
              //   setCitations(currentCitations);
              //   const formattedContent = formatLLMResponse(
              //     assistantMessage,
              //     currentCitations,
              //     currentColorMapping
              //   );
              //   setMessages((prev) => [
              //     ...prev.slice(0, -1),
              //     { role: "assistant", content: formattedContent },
              //   ]);
              // }
            } catch (error) {
              console.error("Error parsing JSON:", error, "Line:", line);
            }
          }
        }

        buffer = buffer.slice(startIndex);
      }

      const finalFormattedContent = formatLLMResponse(
        assistantMessage,
        currentCitations,
        currentColorMapping,
        currentDocuments
      );
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: finalFormattedContent },
      ]);
    } catch (error) {
      console.error("Error:", error);
      if (error instanceof Error && error.message.includes("Too Many Requests")) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "You've sent too many messages. Please wait a moment before sending more.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      }
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

  if (!colorSchemeReady) {
    return (
      <div className="w-[48px] h-[48px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full transition-all duration-300">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-0 right-0 font-bold w-screen h-screen bg-black transition-colors duration-500 ease-in-out"
      >
        <p className="flex flex-col items-center justify-center text-white dark:text-black text-xs font-medium">
          Ask AI
        </p>
      </button>
    );
  }

  return (
    <div className="text-sm w-screen h-screen flex flex-col bg-white dark:bg-gray-800 rounded-lg">
      <div className="relative flex justify-between items-center dark:border-slate-700 select-none border-b">
        <div className="relative">
          <h2 className="font-semibold px-4">
            Technical Documentation AI Chat
          </h2>
          {/* TODO: Get title from db e.g. "Quicksave AI Chat"*/}
          <p className="absolute top-full text-zinc-400 leading-none text-[8px] px-4">
            by OpenDocuChat
          </p>
        </div>
        <div className="flex p-2">
          <button
            className={`mr-2 rounded-full hover:bg-zinc-100 px-4 ${
              messages.some((message) => message.role === "user")
                ? "opacity-100 transition-opacity duration-500"
                : "opacity-0 pointer-events-none"
            }`}
            onClick={resetChat}
            title="New chat"
          >
            New Chat
          </button>
          <button
            className="font-bold w-10 h-10 rounded-full hover:bg-zinc-100"
            onClick={() => setIsOpen(false)}
          >
            <IconXMark className="size-5 m-auto" />
          </button>
        </div>
      </div>

      <div className="text-sm flex-grow overflow-y-auto px-4 mb-10">
        <div className="pb-10 pt-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex mb-4 font-[system-ui,_"Segoe_UI",_Roboto] ${
                msg.role === "user" ? "ml-8 justify-end" : "mr-8"
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

          {citedDocuments.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Sources
              </h3>
              <ul className="space-y-2">
                {citedDocuments.map((doc, index) => (
                  <li
                    key={doc.id}
                    className={`document-item flex cursor-pointer transition-colors border rounded-md border-zinc-200 px-2 py-2 duration-200`}
                    data-document-id={doc.id}
                  >
                    <div
                      className={`text-[11px] inline-flex rounded-full w-3 h-3 font-bold items-center justify-center mr-2 mt-1 ${
                        colorMapping[doc.id].base
                      } ${colorMapping[doc.id].hover}`}
                    ></div>
                    <span className="text-slate-700 dark:text-slate-200 font-medium w-fit">
                      {index + 1}. {urlToBreadcrumb(doc.url)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 w-full text-sm dark:bg-gray-900 flex-shrink-0 p-4 pt-0 dark:border-slate-700 flex">
        <div className="flex items-center border rounded-full overflow-hidden flex-1 hover:border-zinc-300 focus-within:border-zinc-300 bg-white">
          <input
            placeholder="Type your message..."
            className="flex-grow h-12 pl-4 outline-none"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={inputMessage.length === 0 || isLoading}
            className={`text-white h-10 w-10 rounded-full mr-1 transition-all ${
              inputMessage.length === 0 || isLoading
                ? "bg-zinc-500"
                : "bg-black duration-500 active:scale-90"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin m-auto" />
            ) : (
              <IconPaperAirplane className="size-5 m-auto" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
