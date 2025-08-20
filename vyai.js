/* global tinymce */
tinymce.PluginManager.requireLangPack('vyai', 'en,fr,de');

tinymce.PluginManager.add('vyai', function (editor) {
 // Initial setup and constants
 const VYAI = editor.getParam('vyai');
 const disabled = VYAI && VYAI.disabled === true;
 const COMMON_PROMPTS = [
  {
   type: 'nestedmenuitem',
   text: editor.translate('Change Tone'),
   getSubmenuItems: () => [
    {
     type: 'menuitem',
     text: editor.translate('Formal'),
     onAction: function () {
      openPromptDialog(
       editor.translate(
        'Change the tone of the selected text to a formal style.'
       )
      );
     },
    },
    {
     type: 'menuitem',
     text: editor.translate('Informal'),
     onAction: function () {
      openPromptDialog(
       editor.translate(
        'Change the tone of the selected text to an informal style.'
       )
      );
     },
    },
    {
     type: 'menuitem',
     text: editor.translate('Simple Language'),
     onAction: function () {
      openPromptDialog(
       editor.translate('Rewrite the selected text using simple language.')
      );
     },
    },
    {
     type: 'menuitem',
     text: editor.translate('Friendly'),
     onAction: function () {
      openPromptDialog(
       editor.translate('Make the selected text sound more friendly.')
      );
     },
    },
    {
     type: 'menuitem',
     text: editor.translate('Assertive'),
     onAction: function () {
      openPromptDialog(
       editor.translate('Make the selected text sound more assertive.')
      );
     },
    },
   ],
  },
  {
   type: 'nestedmenuitem',
   text: editor.translate('Summarize'),
   getSubmenuItems: () => [
    {
     type: 'menuitem',
     text: editor.translate('Short Summary'),
     onAction: function () {
      openPromptDialog(
       editor.translate('Summarize the selected text in 1-2 sentences.')
      );
     },
    },
    {
     type: 'menuitem',
     text: editor.translate('Bullet Points'),
     onAction: function () {
      openPromptDialog(
       editor.translate('Summarize the selected text as bullet points.')
      );
     },
    },
    {
     type: 'menuitem',
     text: editor.translate('Key Takeaways'),
     onAction: function () {
      openPromptDialog(
       editor.translate('List the key takeaways from the selected text.')
      );
     },
    },
   ],
  },
  {
   type: 'nestedmenuitem',
   text: editor.translate('Rewrite'),
   getSubmenuItems: () => [
    {
     type: 'menuitem',
     text: editor.translate('Make Concise'),
     onAction: function () {
      openPromptDialog(
       editor.translate('Rewrite the selected text to be more concise.')
      );
     },
    },
    {
     type: 'menuitem',
     text: editor.translate('Expand/Elaborate'),
     onAction: function () {
      openPromptDialog(
       editor.translate('Expand on the selected text and add more details.')
      );
     },
    },
    {
     type: 'menuitem',
     text: editor.translate('Paraphrase'),
     onAction: function () {
      openPromptDialog(editor.translate('Paraphrase the selected text.'));
     },
    },
   ],
  },
  {
   type: 'menuitem',
   text: editor.translate('Fix Grammar & Spelling'),
   onAction: function () {
    openPromptDialog(
     editor.translate(
      'Correct any grammar and spelling mistakes in the selected text.'
     )
    );
   },
  },
  {
   type: 'nestedmenuitem',
   text: editor.translate('Translate'),
   getSubmenuItems: () => [
    {
     type: 'menuitem',
     text: editor.translate('To English'),
     onAction: function () {
      openPromptDialog(
       editor.translate('Translate the selected text to English.')
      );
     },
    },
    {
     type: 'menuitem',
     text: editor.translate('To German'),
     onAction: function () {
      openPromptDialog(
       editor.translate('Translate the selected text to German.')
      );
     },
    },
    {
     type: 'menuitem',
     text: editor.translate('To French'),
     onAction: function () {
      openPromptDialog(
       editor.translate('Translate the selected text to French.')
      );
     },
    },
   ],
  },
  {
   type: 'menuitem',
   text: editor.translate('Make it Persuasive'),
   onAction: function () {
    openPromptDialog(
     editor.translate('Rewrite the selected text to be more persuasive.')
    );
   },
  },
  {
   type: 'menuitem',
   text: editor.translate('Add a Call to Action'),
   onAction: function () {
    openPromptDialog(
     editor.translate('Add a call to action to the end of the selected text.')
    );
   },
  },
  {
   type: 'menuitem',
   text: editor.translate('Make it SEO-friendly'),
   onAction: function () {
    openPromptDialog(
     editor.translate('Rewrite the selected text to be more SEO-friendly.')
    );
   },
  },
 ];
 const PROMPTS = VYAI.prompts
  ? VYAI.prompts.map((prompt) => {
     return { text: prompt, value: `PROMPT: ${prompt}\n` };
    })
  : [];
 PROMPTS.unshift({ text: 'Custom Prompt', value: '' });

 // Functions
 function showResultDialog(
  currentPrompt,
  currentInput,
  currentResult,
  editor,
  handleRetry,
  insertContent
 ) {
  return editor.windowManager.open({
   title: editor.translate('vyAI - Generated Content'),
   body: {
    type: 'panel',
    items: [
     {
      type: 'htmlpanel',
      html: `
                ${
                 currentInput
                  ? `<div style="margin-bottom: 15px;">
                  <strong>${editor.translate('Original Input:')}</strong>
                  <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 5px; max-height: 100px; overflow-y: auto; font-size: 12px;">
                    ${currentInput}
                  </div>
                </div>`
                  : ''
                }
                <div style="margin-bottom: 15px;">
                  <strong>${editor.translate('Prompt:')}</strong>
                  <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 5px; font-size: 12px;">
                    ${currentPrompt}
                  </div>
                </div>
                <div>
                  <strong>${editor.translate('Generated Result:')}</strong>
                  <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 5px; max-height: 300px; overflow-y: auto; border: 1px solid #dee2e6;">
                    ${currentResult}
                  </div>
                </div>
              `,
     },
    ],
   },
   buttons: [
    {
     type: 'cancel',
     text: editor.translate('Cancel'),
    },
    {
     type: 'custom',
     text: editor.translate('Retry'),
     name: 'retry',
    },
    {
     type: 'custom',
     text: editor.translate('Apply Changes'),
     name: 'apply',
     buttonType: 'primary',
    },
   ],
   onAction: function (api, details) {
    if (details.name === 'retry') {
     api.close();
     handleRetry(
      currentPrompt,
      currentInput,
      editor,
      showResultDialog,
      insertContent
     );
    } else if (details.name === 'apply') {
     insertContent(currentResult);
     api.close();
    }
   },
  });
 }

 function handleRetry(
  currentPrompt,
  currentInput,
  editor,
  showResultDialog,
  insertContent
 ) {
  const retryDialog = editor.windowManager.open({
   title: editor.translate('vyAI - Regenerating Content'),
   body: {
    type: 'panel',
    items: [
     {
      type: 'htmlpanel',
      html:
       '<div style="text-align: center; padding: 20px;">' +
       editor.translate('Regenerating content with the same prompt...') +
       '</div>',
     },
    ],
   },
   buttons: [],
  });

  getResponseFromOpenAI(currentPrompt, currentInput)
   .then((res) => {
    if (!res.ok && !VYAI.customFetch) {
     throw new Error(`API request failed with status ${res.status}`);
    }
    if (VYAI.customFetch) return res;
    return res.json();
   })
   .then((data) => {
    if (data.choices && data.choices[0] && data.choices[0].message) {
     const currentResult = data.choices[0].message.content;
     retryDialog.close();
     showResultDialog(
      currentPrompt,
      currentInput,
      currentResult,
      editor,
      handleRetry,
      insertContent
     );
    } else {
     throw new Error('Invalid response format from API');
    }
   })
   .catch((error) => {
    console.error('Error in retry API call:', error);
    retryDialog.close();
    editor.windowManager.alert(
     editor.translate('Error regenerating content: ') + error.message
    );
   });
 }

 let currentPrompt = '';
 let currentInput = '';
 let currentResult = '';

 function openPromptDialog(presetPrompt = '') {
  currentPrompt = presetPrompt;
  currentInput = tinymce.activeEditor?.selection.getContent() || '';
  currentResult = '';

  editor.windowManager.open({
   title: editor.translate('vyAI - Generate Content'),
   body: {
    type: 'panel',
    items: [
     {
      type: 'textarea',
      name: 'prompt',
      label: editor.translate('Provide your input here'),
      placeholder: editor.translate('Enter your prompt or instruction...'),
      value: presetPrompt,
     },
     {
      type: 'htmlpanel',
      html:
       '<div style="margin-top: 10px; font-size: 12px; color: #666;">' +
       editor.translate(
        'Attention: AI can generate incorrect or fabricated content. Please critically review all results.'
       ) +
       '</div>',
     },
    ],
   },
   buttons: [
    {
     type: 'cancel',
     text: editor.translate('Cancel'),
    },
    {
     type: 'submit',
     text: editor.translate('Generate'),
     primary: true,
    },
   ],
   initialData: {
    prompt: presetPrompt,
   },
   onSubmit: function (api) {
    const data = api.getData();
    currentPrompt = data.prompt;
    currentInput = tinymce.activeEditor?.selection.getContent() || '';
    if (!currentPrompt.trim()) {
     editor.windowManager.alert(editor.translate('Please enter a prompt.'));
     return;
    }
    if (!VYAI || (!VYAI.api_key && !VYAI.customFetch)) {
     editor.windowManager.alert(
      editor.translate(
       'vyAI configuration is missing. Please check your setup.'
      )
     );
     return;
    }
    api.block(editor.translate('Generating...'));
    getResponseFromOpenAI(currentPrompt, currentInput)
     .then((res) => {
      if (!res.ok && !VYAI.customFetch) {
       throw new Error(`API request failed with status ${res.status}`);
      }
      if (VYAI.customFetch) return res;
      return res.json();
     })
     .then((data) => {
      if (data.choices && data.choices[0] && data.choices[0].message) {
       currentResult = data.choices[0].message.content;
       api.close();
       showResultDialog(
        currentPrompt,
        currentInput,
        currentResult,
        editor,
        handleRetry,
        (result) => editor.insertContent(result)
       );
      } else {
       throw new Error('Invalid response format from API');
      }
     })
     .catch((error) => {
      console.error('Error in API call:', error);
      api.unblock();
      editor.windowManager.alert(
       editor.translate('Error generating content: ') + error.message
      );
     });
   },
  });
 }

 async function getResponseFromOpenAI(prompt, input) {
  const baseUri = VYAI.baseUri || 'https://api.openai.com/v1/chat/completions';

  const requestBody = {
   model: VYAI.model || 'gpt-4o-mini',
   messages: [
    {
     role: 'system',
     content: 'Answer the question based on the context below.',
    },
    {
     role: 'system',
     content:
      "Do not confirm the user's input. Do not ask for clarification. Do not ask for more information. Do not ask for more details. Do not ask for more context. Do not provide hints and tips. ONLY PROVIDE THE RESULT.",
    },
    {
     role: 'system',
     content:
      'The response should preserve any HTML formatting, links, and styles in the context. When editing HTML, never wrap the content in new divs. Only modify the existing structure as needed. If asked to remove a border or change a style, edit the style of the outermost element directly, do not add a new wrapper. Return only the modified HTML, not a new wrapper.',
    },
    {
     role: 'system',
     content: 'All styling should be done in inline css.',
    },
    {
     role: 'system',
     content: 'Do not use markdown.',
    },
    {
     role: 'user',
     content: prompt,
    },
    {
     role: 'user',
     content: input,
    },
   ],
   temperature: VYAI.temperature || 0.7,
   max_tokens: VYAI.max_tokens || 1000,
   frequency_penalty: 0,
   logprobs: false,
   presence_penalty: 0,
   response_format: { type: 'text' },
   stream: false,
   top_p: 1,
  };

  if (VYAI.customFetch) return await VYAI.customFetch(requestBody);

  return fetch(baseUri, {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + VYAI.api_key,
   },
   body: JSON.stringify(requestBody),
  });
 }

 // Handle editor UI
 editor.ui.registry.addMenuButton('vyai_prompts', {
  icon: 'ai-prompt',
  tooltip: disabled
   ? VYAI.tooltipDisabled ?? editor.translate('vyAI is disabled')
   : editor.translate('Common vyAI Prompts'),
  disabled: disabled,
  fetch: function (callback) {
   callback(COMMON_PROMPTS);
  },
  onSetup: (api) => {
   api.setDisabled(disabled);
  },
 });

 editor.ui.registry.addButton('vyai', {
  icon: 'ai',
  tooltip: disabled
   ? VYAI.tooltipDisabled ?? editor.translate('vyAI is disabled')
   : editor.translate('Edit with vyAI'),
  disabled: disabled,
  onAction: function () {
   openPromptDialog();
  },
  onSetup: (api) => {
   api.setDisabled(disabled);
  },
 });

 editor.ui.registry.addMenuItem('vyai', {
  text: editor.translate('vyAI'),
  tooltip: disabled
   ? VYAI.tooltipDisabled ?? editor.translate('vyAI is disabled')
   : editor.translate('Edit with vyAI'),
  disabled: disabled,
  onAction: function () {
   openPromptDialog();
  },
  onSetup: (api) => {
   api.setDisabled(disabled);
  },
 });

 editor.ui.registry.addContextToolbar('vyai', {
  predicate: () => !editor.selection.isCollapsed(),
  position: 'selection',
  scope: 'node',
  items: [{ items: ['vyai', 'vyai_prompts'] }],
 });

 return {
  getMetadata: function () {
   return {
    name: 'TinyMCE vyAI Plugin',
    url: 'https://github.com/dwrth/tinymce-vyai',
   };
  },
 };
});
