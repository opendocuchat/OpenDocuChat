import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { sql } from "@vercel/postgres";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, dev }) => {
    if (isServer && !dev) {
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.afterEmit.tapPromise(
            "SetupDeployingUser",
            async () => {
              console.log("Setting up deploying user...");
              const deployingUser = process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN;
              console.log("Deploying user:", deployingUser);

              if (!deployingUser) {
                console.log("No deploying user found. Skipping user setup.");
                return;
              }

              try {
                const response = await fetch(
                  `https://api.github.com/users/${deployingUser}`
                );
                if (!response.ok) {
                  throw new Error("Failed to fetch GitHub user data");
                }
                const userData = await response.json();

                await sql`
                INSERT INTO account (github_id, github_username)
                VALUES (${userData.id}, ${userData.login})
                ON CONFLICT DO NOTHING
              `;

                console.log(
                  `Deploying user ${deployingUser} has been set up successfully.`
                );
              } catch (error) {
                console.error("Error in setting up deploying user:", error);
              }
            }
          );

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

          compiler.hooks.afterEmit.tapPromise(
            "GenerateWidgetLoader",
            async () => {
              console.log("Generating chat-widget-loader.js...");
              try {
                const deployedUrl = process.env.NEXT_PUBLIC_VERCEL_URL

                const script = `
              (function () {
                var container = document.createElement("div");
                container.style.position = "fixed";
                container.style.bottom = "20px";
                container.style.right = "20px";
                container.style.zIndex = "9998";
                var iframe = document.createElement("iframe");
                iframe.src = "https://${deployedUrl}/widget";
                iframe.style.width = "48px";
                iframe.style.height = "48px";
                iframe.style.border = "none";
                iframe.style.borderRadius = "50%";
                iframe.style.overflow = "hidden";
                iframe.style.boxShadow = "0px 3px 30px rgba(0, 0, 0, 0.2)";
                iframe.style.transition = "all 0.3s ease";
                var link = document.createElement("a");
                link.href = "https://opendocuchat.com";
                link.textContent = "Technical Documentation AI Chatbot by OpenDocuChat";
                link.style.position = "absolute";
                link.style.left = "-9999px";
                link.style.top = "-9999px";

                container.appendChild(iframe);
                container.appendChild(link);

                document.body.appendChild(container);

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

                fs.writeFileSync(
                  path.join(process.cwd(), "public", "chat-widget-loader.js"),
                  script
                );
                console.log("chat-widget-loader.js has been generated.");
              } catch (error) {
                console.error(
                  "Failed to generate chat-widget-loader.js:",
                  error
                );
                process.exit(1);
              }
            }
          );
        },
      });
    }
    return config;
  },
};

export default nextConfig;
