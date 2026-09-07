/* global hugerte */
hugerte.PluginManager.requireLangPack("vyai", "en,fr,de");

hugerte.PluginManager.add("vyai", function (editor) {
  const VYAI = editor.getParam("vyai");
  const disabled = VYAI && VYAI.disabled === true;
  const assistantName = VYAI?.assistantName || "vyAI";

  let popoverEl = null;
  let abortController = null;
  let streamMarkerId = null;
  let preStreamBookmark = null;
  let usedFullContent = false;

  const COMMON_PROMPTS = [
    {
      type: "nestedmenuitem",
      text: editor.translate("Change Tone"),
      getSubmenuItems: () => [
        menuItem("Formal", "Change the tone of the selected text to a formal style."),
        menuItem("Informal", "Change the tone of the selected text to an informal style."),
        menuItem("Simple Language", "Rewrite the selected text using simple language."),
        menuItem("Friendly", "Make the selected text sound more friendly."),
        menuItem("Assertive", "Make the selected text sound more assertive."),
      ],
    },
    {
      type: "nestedmenuitem",
      text: editor.translate("Summarize"),
      getSubmenuItems: () => [
        menuItem("Short Summary", "Summarize the selected text in 1-2 sentences."),
        menuItem("Bullet Points", "Summarize the selected text as bullet points."),
        menuItem("Key Takeaways", "List the key takeaways from the selected text."),
      ],
    },
    {
      type: "nestedmenuitem",
      text: editor.translate("Rewrite"),
      getSubmenuItems: () => [
        menuItem("Make Concise", "Rewrite the selected text to be more concise."),
        menuItem("Expand/Elaborate", "Expand on the selected text and add more details."),
        menuItem("Paraphrase", "Paraphrase the selected text."),
      ],
    },
    menuItem("Fix Grammar & Spelling", "Correct any grammar and spelling mistakes in the selected text."),
    {
      type: "nestedmenuitem",
      text: editor.translate("Translate"),
      getSubmenuItems: () => [
        menuItem("To English", "Translate the selected text to English."),
        menuItem("To German", "Translate the selected text to German."),
        menuItem("To French", "Translate the selected text to French."),
      ],
    },
    menuItem("Make it Persuasive", "Rewrite the selected text to be more persuasive."),
    menuItem("Add a Call to Action", "Add a call to action to the end of the selected text."),
    menuItem("Make it SEO-friendly", "Rewrite the selected text to be more SEO-friendly."),
  ];

  function menuItem(text, prompt) {
    return {
      type: "menuitem",
      text: editor.translate(text),
      onAction: function () {
        openPromptPopover(editor.translate(prompt), true);
      },
    };
  }

  function getContextHtml() {
    if (!editor.selection.isCollapsed()) {
      return {
        html: editor.selection.getContent({ format: "html" }) || "",
        fullContent: false,
      };
    }
    return {
      html: editor.getContent({ format: "html" }) || "",
      fullContent: true,
    };
  }

  function ensureStyles() {
    if (document.getElementById("vyai-popover-styles")) return;
    const style = document.createElement("style");
    style.id = "vyai-popover-styles";
    style.textContent = `
      .vyai-popover {
        position: fixed;
        z-index: 100000;
        width: min(360px, calc(100vw - 24px));
        background: #fff;
        color: #111;
        border: 1px solid #d0d7de;
        border-radius: 10px;
        box-shadow: 0 8px 28px rgba(0,0,0,.18);
        padding: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
      }
      .vyai-popover__title {
        font-weight: 600;
        margin-bottom: 8px;
      }
      .vyai-popover textarea {
        width: 100%;
        min-height: 72px;
        resize: vertical;
        box-sizing: border-box;
        border: 1px solid #d0d7de;
        border-radius: 8px;
        padding: 8px 10px;
        font: inherit;
        line-height: 1.4;
      }
      .vyai-popover__hint {
        margin-top: 6px;
        font-size: 11px;
        color: #666;
      }
      .vyai-popover__actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 10px;
      }
      .vyai-popover button {
        border-radius: 8px;
        border: 1px solid #d0d7de;
        background: #f6f8fa;
        padding: 6px 10px;
        cursor: pointer;
        font: inherit;
      }
      .vyai-popover button[data-primary="true"] {
        background: #111;
        border-color: #111;
        color: #fff;
      }
      .vyai-popover button:disabled {
        opacity: .55;
        cursor: default;
      }
      .vyai-popover__status {
        margin-top: 8px;
        min-height: 16px;
        font-size: 12px;
        color: #57606a;
      }
      .vyai-popover__status[data-error="true"] {
        color: #cf222e;
      }
      .vyai-streaming {
        outline: 1px dashed #8b949e;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  function notify(text, type) {
    editor.notificationManager.open({
      text,
      type: type || "info",
      timeout: 4000,
    });
  }

  function getSelectionScreenRect() {
    const iframe = editor.iframeElement;
    const iframeRect = iframe.getBoundingClientRect();
    let rect = null;

    try {
      rect = editor.selection.getBoundingClientRect();
    } catch (e) {
      rect = null;
    }

    if (!rect || (rect.width === 0 && rect.height === 0)) {
      const rng = editor.selection.getRng();
      if (rng && rng.getClientRects) {
        const clientRects = rng.getClientRects();
        if (clientRects.length) {
          rect = clientRects[clientRects.length - 1];
        }
      }
    }

    if (!rect) {
      const container = editor.getContentAreaContainer().getBoundingClientRect();
      return {
        top: container.top + 16,
        left: container.left + 16,
        bottom: container.top + 48,
        right: container.left + 200,
        width: 184,
        height: 32,
      };
    }

    return {
      top: iframeRect.top + rect.top,
      left: iframeRect.left + rect.left,
      bottom: iframeRect.top + rect.bottom,
      right: iframeRect.left + rect.right,
      width: rect.width,
      height: rect.height,
    };
  }

  function positionPopover(el) {
    const sel = getSelectionScreenRect();
    const gap = 8;
    const width = el.offsetWidth || 360;
    const height = el.offsetHeight || 180;

    let left = sel.left;
    let top = sel.bottom + gap;

    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, sel.top - height - gap);
    }

    el.style.left = `${Math.max(12, left)}px`;
    el.style.top = `${Math.max(12, top)}px`;
  }

  function setStatus(text, isError) {
    if (!popoverEl) return;
    const status = popoverEl.querySelector(".vyai-popover__status");
    if (!status) return;
    status.textContent = text || "";
    status.dataset.error = isError ? "true" : "false";
  }

  function setGeneratingUi(isGenerating) {
    if (!popoverEl) return;
    const textarea = popoverEl.querySelector("textarea");
    const generateBtn = popoverEl.querySelector('[data-action="generate"]');
    const cancelBtn = popoverEl.querySelector('[data-action="cancel"]');
    const undoBtn = popoverEl.querySelector('[data-action="undo"]');
    const doneBtn = popoverEl.querySelector('[data-action="done"]');

    textarea.disabled = isGenerating;
    generateBtn.disabled = isGenerating;
    generateBtn.hidden = isGenerating;
    cancelBtn.textContent = isGenerating
      ? editor.translate("Stop")
      : editor.translate("Close");
    undoBtn.hidden = true;
    doneBtn.hidden = true;
  }

  function setCompletedUi() {
    if (!popoverEl) return;
    const generateBtn = popoverEl.querySelector('[data-action="generate"]');
    const undoBtn = popoverEl.querySelector('[data-action="undo"]');
    const doneBtn = popoverEl.querySelector('[data-action="done"]');
    const cancelBtn = popoverEl.querySelector('[data-action="cancel"]');
    const textarea = popoverEl.querySelector("textarea");

    textarea.disabled = false;
    generateBtn.disabled = false;
    generateBtn.hidden = false;
    generateBtn.textContent = editor.translate("Retry");
    undoBtn.hidden = false;
    doneBtn.hidden = false;
    cancelBtn.textContent = editor.translate("Close");
  }

  function removeStreamMarker(keepChildren) {
    if (!streamMarkerId) return;
    const el = editor.getDoc().getElementById(streamMarkerId);
    if (el) {
      editor.dom.remove(el, keepChildren);
    }
    streamMarkerId = null;
  }

  function restoreOriginalContent(originalHtml) {
    removeStreamMarker(false);
    if (usedFullContent) {
      editor.setContent(originalHtml || "");
      return;
    }
    if (preStreamBookmark) {
      editor.selection.moveToBookmark(preStreamBookmark);
    }
    editor.selection.setContent(originalHtml || "");
  }

  function closePopover() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (popoverEl) {
      popoverEl.remove();
      popoverEl = null;
    }
    if (streamMarkerId) {
      removeStreamMarker(true);
    }
    window.removeEventListener("resize", onReposition);
    editor.off("ScrollContent", onReposition);
  }

  function onReposition() {
    if (popoverEl) positionPopover(popoverEl);
  }

  function onDocPointerDown(event) {
    if (!popoverEl) return;
    if (popoverEl.contains(event.target)) return;
    if (!abortController) {
      closePopover();
      document.removeEventListener("mousedown", onDocPointerDown, true);
    }
  }

  async function readStreamingContent(response, onChunk, signal) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API request failed with status ${response.status}`);
    }
    if (!response.body) {
      throw new Error("Streaming response body is missing");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";

    while (true) {
      if (signal && signal.aborted) {
        try {
          await reader.cancel();
        } catch (e) {}
        throw new DOMException("Aborted", "AbortError");
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            content += delta;
            onChunk(content);
          }
        } catch (e) {}
      }
    }

    return content;
  }

  function updateStreamTarget(html) {
    if (!streamMarkerId) return;
    const el = editor.getDoc().getElementById(streamMarkerId);
    if (!el) return;
    el.innerHTML = html || "";
    try {
      el.scrollIntoView({ block: "nearest" });
    } catch (e) {}
  }

  function placeStreamMarker() {
    streamMarkerId = "vyai-stream-" + Date.now();
    const marker = `<span id="${streamMarkerId}" class="vyai-streaming"></span>`;

    if (usedFullContent) {
      editor.setContent(marker);
    } else {
      editor.selection.setContent(marker);
    }
  }

  async function runGeneration(prompt, contextHtml, fullContent) {
    if (!VYAI || (!VYAI.api_key && !VYAI.customFetch)) {
      setStatus(
        assistantName +
          " " +
          editor.translate("configuration is missing. Please check your setup."),
        true
      );
      return;
    }
    if (!prompt.trim()) {
      setStatus(editor.translate("Please enter a prompt."), true);
      return;
    }

    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();
    const { signal } = abortController;

    usedFullContent = !!fullContent;
    setGeneratingUi(true);
    setStatus(editor.translate("Generating..."));

    preStreamBookmark = editor.selection.getBookmark(2, true);

    editor.undoManager.transact(() => {
      placeStreamMarker();
    });

    try {
      const response = await getResponseFromOpenAI(prompt, contextHtml, signal);
      const content = await readStreamingContent(
        response,
        (partial) => {
          editor.undoManager.ignore(() => {
            updateStreamTarget(partial);
          });
        },
        signal
      );

      if (!content) {
        throw new Error(editor.translate("Invalid response format from API"));
      }

      editor.undoManager.transact(() => {
        updateStreamTarget(content);
        removeStreamMarker(true);
      });

      abortController = null;
      setCompletedUi();
      setStatus(editor.translate("Done. Review the text in the editor."));
      positionPopover(popoverEl);
    } catch (error) {
      if (error && error.name === "AbortError") {
        editor.undoManager.transact(() => {
          restoreOriginalContent(contextHtml);
        });
        abortController = null;
        setGeneratingUi(false);
        setStatus(editor.translate("Stopped."));
        return;
      }

      console.error("Error in API call:", error);
      editor.undoManager.transact(() => {
        restoreOriginalContent(contextHtml);
      });
      abortController = null;
      setGeneratingUi(false);
      setStatus(
        editor.translate("Error generating content: ") + (error.message || error),
        true
      );
      notify(
        editor.translate("Error generating content: ") + (error.message || error),
        "error"
      );
    }
  }

  function openPromptPopover(presetPrompt, autoGenerate) {
    if (disabled) return;

    ensureStyles();
    closePopover();

    const context = getContextHtml();

    popoverEl = document.createElement("div");
    popoverEl.className = "vyai-popover";
    popoverEl.setAttribute("role", "dialog");
    popoverEl.innerHTML = `
      <div class="vyai-popover__title">${assistantName}</div>
      <textarea placeholder="${editor.translate("Enter your prompt or instruction...")}"></textarea>
      <div class="vyai-popover__hint">${editor.translate(
        "Attention: AI can generate incorrect or fabricated content. Please critically review all results."
      )}</div>
      <div class="vyai-popover__actions">
        <button type="button" data-action="undo" hidden>${editor.translate("Undo")}</button>
        <button type="button" data-action="cancel">${editor.translate("Close")}</button>
        <button type="button" data-action="done" hidden data-primary="true">${editor.translate("Done")}</button>
        <button type="button" data-action="generate" data-primary="true">${editor.translate("Generate")}</button>
      </div>
      <div class="vyai-popover__status"></div>
    `;

    const textarea = popoverEl.querySelector("textarea");
    textarea.value = presetPrompt || "";

    popoverEl.addEventListener("click", (event) => {
      const action = event.target && event.target.getAttribute("data-action");
      if (!action) return;

      if (action === "generate") {
        runGeneration(textarea.value, context.html, context.fullContent);
      } else if (action === "cancel") {
        if (abortController) {
          abortController.abort();
        } else {
          closePopover();
          document.removeEventListener("mousedown", onDocPointerDown, true);
        }
      } else if (action === "undo") {
        editor.undoManager.undo();
        closePopover();
        document.removeEventListener("mousedown", onDocPointerDown, true);
      } else if (action === "done") {
        closePopover();
        document.removeEventListener("mousedown", onDocPointerDown, true);
      }
    });

    textarea.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        runGeneration(textarea.value, context.html, context.fullContent);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (abortController) abortController.abort();
        else {
          closePopover();
          document.removeEventListener("mousedown", onDocPointerDown, true);
        }
      }
    });

    document.body.appendChild(popoverEl);
    positionPopover(popoverEl);
    window.addEventListener("resize", onReposition);
    editor.on("ScrollContent", onReposition);
    document.addEventListener("mousedown", onDocPointerDown, true);

    textarea.focus();
    textarea.selectionStart = textarea.value.length;

    if (autoGenerate && presetPrompt) {
      runGeneration(presetPrompt, context.html, context.fullContent);
    }
  }

  async function getResponseFromOpenAI(prompt, input, signal) {
    const baseUri =
      VYAI.baseUri || "https://api.openai.com/v1/chat/completions";

    const requestBody = {
      model: VYAI.model || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Answer the question based on the context below.",
        },
        {
          role: "system",
          content:
            "Do not confirm the user's input. Do not ask for clarification. Do not ask for more information. Do not ask for more details. Do not ask for more context. Do not provide hints and tips. ONLY PROVIDE THE RESULT.",
        },
        {
          role: "system",
          content:
            "The response should preserve any HTML formatting, links, and styles in the context. When editing HTML, never wrap the content in new divs. Only modify the existing structure as needed. If asked to remove a border or change a style, edit the style of the outermost element directly, do not add a new wrapper. Return only the modified HTML, not a new wrapper.",
        },
        {
          role: "system",
          content: "All styling should be done in inline css.",
        },
        {
          role: "system",
          content: "Do not use markdown.",
        },
        {
          role: "system",
          content:
            "You are a helpful AI assistant for email formatting and text writing. You must NEVER access, request, or work with any customer data, databases, or system information. You can only help with general writing tasks, email formatting, and text generation. If asked about data, customers, or system information, politely decline and explain you can only help with writing tasks.",
        },
        {
          role: "user",
          content: prompt,
        },
        {
          role: "user",
          content: input,
        },
      ],
      temperature: VYAI.temperature || 0.7,
      max_tokens: VYAI.max_tokens || 1000,
      frequency_penalty: 0,
      logprobs: false,
      presence_penalty: 0,
      response_format: { type: "text" },
      stream: true,
      top_p: 1,
    };

    if (VYAI.customFetch) return await VYAI.customFetch(requestBody);

    return fetch(baseUri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + VYAI.api_key,
      },
      body: JSON.stringify(requestBody),
      signal,
    });
  }

  editor.on("remove", () => {
    closePopover();
    document.removeEventListener("mousedown", onDocPointerDown, true);
  });

  editor.ui.registry.addMenuButton("vyai_prompts", {
    icon: "ai-prompt",
    tooltip: disabled
      ? VYAI.tooltipDisabled ??
        assistantName + " " + editor.translate("is disabled")
      : editor.translate("Common") +
        " " +
        assistantName +
        " " +
        editor.translate("Prompts"),
    disabled: disabled,
    fetch: function (callback) {
      callback(COMMON_PROMPTS);
    },
    onSetup: (api) => {
      api.setEnabled(!disabled);
    },
  });

  editor.ui.registry.addButton("vyai", {
    icon: "ai",
    tooltip: disabled
      ? VYAI.tooltipDisabled ??
        assistantName + " " + editor.translate("is disabled")
      : editor.translate("Edit with") + " " + assistantName,
    disabled: disabled,
    onAction: function () {
      openPromptPopover();
    },
    onSetup: (api) => {
      api.setEnabled(!disabled);
    },
  });

  editor.ui.registry.addMenuItem("vyai", {
    text: assistantName,
    tooltip: disabled
      ? VYAI.tooltipDisabled ??
        assistantName + " " + editor.translate("is disabled")
      : editor.translate("Edit with") + " " + assistantName,
    disabled: disabled,
    onAction: function () {
      openPromptPopover();
    },
    onSetup: (api) => {
      api.setEnabled(!disabled);
    },
  });

  editor.ui.registry.addContextToolbar("vyai", {
    predicate: () => !editor.selection.isCollapsed(),
    position: "selection",
    scope: "node",
    items: "vyai vyai_prompts",
  });

  return {
    getMetadata: function () {
      return {
        name: "hugerte AI Plugin",
        url: "https://github.com/dwrth/hugerte-vyai",
      };
    },
  };
});
