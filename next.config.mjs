import { execSync } from "child_process";
import fs from 'fs';
import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, dev }) => {
    if (isServer && !dev) {
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.afterEmit.tapPromise("RunMigrations", async () => {
            console.log("Running database migrations...");
            try {
              execSync("node scripts/migrate-db.js", {
                stdio: "inherit",
              });
            } catch (error) {
              console.error("Failed to run migrations:", error);
              process.exit(1);
            }
          });

          compiler.hooks.afterEmit.tapPromise("GenerateWidgetLoader", async () => {
            console.log("Generating chat-widget-loader.js...");
            try {
              const productionUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || 
                                    process.env.NEXT_PUBLIC_VERCEL_URL || 
                                    'your-default-url.vercel.app';

              const script = `
              (function () {
                var iframe = document.createElement("iframe");
                iframe.src =
                  window.location.hostname === "localhost"
                    ? "http://localhost:3000/widget"
                    : "https://${productionUrl}/widget";
                iframe.style.position = "fixed";
                iframe.style.bottom = "20px";
                iframe.style.right = "20px";
                iframe.style.width = "48px";
                iframe.style.height = "48px";
                iframe.style.border = "none";
                iframe.style.zIndex = "9999";
                iframe.style.transition = "all 0.17s ease";
                iframe.style.borderRadius = "50%";
                iframe.style.overflow = "hidden";
                iframe.style.boxShadow = "0px 3px 30px rgba(0, 0, 0, 0.2)";

                document.body.appendChild(iframe);

                function updateIframeSize(width, height) {
                  var maxWidth = Math.min(parseInt(width), window.innerWidth * 0.9);
                  var maxHeight = Math.min(parseInt(height), window.innerHeight * 0.9);
                  iframe.style.width = maxWidth + "px";
                  iframe.style.height = maxHeight + "px";
                  iframe.style.borderRadius = width === "48px" ? "50%" : "28px";
                }

                function detectColorScheme() {
                  const isDarkClass = document.documentElement.classList.contains("dark");
                  const isDarkMedia = window.matchMedia(
                    "(prefers-color-scheme: dark)"
                  ).matches;
                  return isDarkClass ? "dark" : "light";
                }

                function sendColorScheme() {
                  const colorScheme = detectColorScheme();
                  iframe.contentWindow.postMessage(
                    {
                      type: "COLOR_SCHEME_UPDATE",
                      colorScheme: colorScheme,
                    },
                    "*"
                  );
                }

                const sendInitialColorScheme = () => {
                  if (iframe.contentWindow) {
                    sendColorScheme();
                  } else {
                    requestAnimationFrame(sendInitialColorScheme);
                  }
                };
                sendInitialColorScheme();

                const observer = new MutationObserver((mutations) => {
                  mutations.forEach((mutation) => {
                    if (mutation.attributeName === "class") {
                      sendColorScheme();
                    }
                  });
                });

                observer.observe(document.documentElement, { attributes: true });

                const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
                mediaQuery.addListener(() => {
                  sendColorScheme();
                });

                window.addEventListener("message", (event) => {
                  if (event.data.type === "REQUEST_COLOR_SCHEME") {
                    sendColorScheme();
                  }
                });

                window.addEventListener(
                  "message",
                  function (event) {
                    if (event.data.type === "RESIZE_CHAT_WIDGET") {
                      iframe.style.transform = "scale(1)";
                      updateIframeSize(event.data.width, event.data.height);
                    }
                  },
                  false
                );

                window.addEventListener("resize", function () {
                  if (iframe.style.width !== "48px") {
                    updateIframeSize(iframe.style.width, iframe.style.height);
                  }
                });

                iframe.addEventListener("mouseover", () => {
                  if (iframe.style.width !== "48px") return;
                  iframe.style.transition = "all 0.17s ease";
                  iframe.style.transform = "scale(1.1)";
                });

                iframe.addEventListener("mouseout", () => {
                  iframe.style.transform = "scale(1)";
                });
              })();
              `;

              fs.writeFileSync(path.join(process.cwd(), 'public', 'chat-widget-loader.js'), script);
              console.log('chat-widget-loader.js has been generated.');
            } catch (error) {
              console.error("Failed to generate chat-widget-loader.js:", error);
              process.exit(1);
            }
          });
        },
      });
    }
    return config;
  },
};

export default nextConfig;