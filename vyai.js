/* global tinymce */
tinymce.PluginManager.requireLangPack('vyai', 'en,fr,de');

tinymce.PluginManager.add('vyai', function (editor) {
 const VYAI = editor.getParam('vyai');

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
                <div style="margin-bottom: 15px;">
                  <strong>${editor.translate('Original Input:')}</strong>
                  <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 5px; max-height: 100px; overflow-y: auto; font-size: 12px;">
                    ${currentInput || editor.translate('No text selected')}
                  </div>
                </div>
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
    if (!res.ok) {
     throw new Error(`API request failed with status ${res.status}`);
    }
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

 /**
  * Create a list of prompts for the select box
  */
 const PROMPTS = VYAI.prompts
  ? VYAI.prompts.map((prompt) => {
     return { text: prompt, value: `PROMPT: ${prompt}\n` };
    })
  : [];
 PROMPTS.unshift({ text: 'Custom Prompt', value: '' });

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

 editor.ui.registry.addIcon(
  'vyai',
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="transparent" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles-icon lucide-sparkles"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>'
 );
 editor.ui.registry.addIcon(
  'vyai-wand-sparkles',
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="transparent" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wand-sparkles-icon lucide-wand-sparkles"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>'
 );

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

 editor.ui.registry.addMenuButton('vyai_prompts', {
  icon: 'vyai-wand-sparkles',
  tooltip: editor.translate('Common vyAI Prompts'),
  fetch: function (callback) {
   callback(COMMON_PROMPTS);
  },
 });

 editor.ui.registry.addButton('vyai', {
  icon: 'vyai',
  tooltip: editor.translate('Edit with vyAI'),
  onAction: function () {
   openPromptDialog();
  },
 });

 /* Adds a menu item, which can then be included in any menu via the menu/menubar configuration */
 editor.ui.registry.addMenuItem('vyai', {
  text: editor.translate('vyAI'),
  onAction: function () {
   openPromptDialog();
  },
 });

 /* Add context menu item that appears when text is selected */
 editor.ui.registry.addContextToolbar('vyai', {
  predicate: (node) => !editor.selection.isCollapsed(),
  position: 'selection',
  scope: 'node',
  items: [{ items: ['vyai', 'vyai_prompts'] }],
 });

 /**
  * Get the current selection and set it as the default input
  * @param prompt
  * @returns {Promise<Response>}
  */
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

 return {
  getMetadata: function () {
   return {
    name: 'TinyMCE vyAI Plugin',
    url: 'https://github.com/dwrth/tinymce-vyai',
   };
  },
 };
});
