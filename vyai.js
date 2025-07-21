/* global tinymce */
// Load the required translation files
tinymce.PluginManager.requireLangPack('vyai', 'en,fr,de');

tinymce.PluginManager.add('vyai', function (editor) {
 const VYAI = editor.getParam('vyai');

 // Debug: Check if VYAI configuration is available

 const openDialog = function () {
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

  const createInputDialog = () => {
   return editor.windowManager.open({
    title: editor.translate('vyAI - Generate Content'),
    body: {
     type: 'panel',
     items: [
      {
       type: 'textarea',
       name: 'prompt',
       label: editor.translate('Provide your input here'),
       placeholder: editor.translate('Enter your prompt or instruction...'),
      },
      {
       type: 'htmlpanel',
       html:
        '<div style="margin-top: 10px; font-size: 12px; color: #666;">' +
        editor.translate('Selected text will be used as context') +
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

    /**
     * Set the default input to the current selection
     */
    initialData: {
     prompt: '',
    },

    onSubmit: function (api) {
     const data = api.getData();

     currentPrompt = data.prompt;
     currentInput = tinymce.activeEditor?.selection.getContent() || '';

     // Validate required fields
     if (!currentPrompt.trim()) {
      editor.windowManager.alert(editor.translate('Please enter a prompt.'));
      return;
     }

     // Validate VYAI configuration
     if (!VYAI || !VYAI.api_key) {
      editor.windowManager.alert(
       editor.translate(
        'vyAI configuration is missing. Please check your setup.'
       )
      );
      return;
     }

     // Change button text to "Loading"
     api.block(editor.translate('Generating...'));

     getResponseFromOpenAI(currentPrompt, currentInput)
      .then((res) => {
       if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
       }
       return res.json();
      })
      .then((data) => {
       if (data.choices && data.choices[0] && data.choices[0].message) {
        currentResult = data.choices[0].message.content;
        api.close();
        showResultDialog();
       } else {
        throw new Error('Invalid response format from API');
       }
      })
      .catch((error) => {
       console.error('Error in API call:', error);
       api.unblock();
       // Show error in dialog
       editor.windowManager.alert(
        editor.translate('Error generating content: ') + error.message
       );
      });
    },
   });
  };

  const showResultDialog = () => {
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
      handleRetry();
     } else if (details.name === 'apply') {
      editor.insertContent(currentResult);
      api.close();
     }
    },
   });
  };

  const handleRetry = () => {
   // Show loading dialog for retry
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
      currentResult = data.choices[0].message.content;
      retryDialog.close();
      showResultDialog();
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
  };

  // Start with the input dialog
  createInputDialog();
 };

 /**
  * Get the current selection and set it as the default input
  * @param prompt
  * @returns {Promise<Response>}
  */
 function getResponseFromOpenAI(prompt, input) {
  const baseUri = VYAI.baseUri || 'https://api.openai.com/v1/chat/completions';

  const requestBody = {
   model: VYAI.model || 'gpt-3.5-turbo',
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
      'The response should preserve any HTML formatting, links, and styles in the context.',
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
  };

  return fetch(baseUri, {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + VYAI.api_key,
   },
   body: JSON.stringify(requestBody),
  });
 }

 /* Add a vyAI icon */
 editor.ui.registry.addIcon(
  'vyai',
  '<img src="https://cdn.jsdelivr.net/gh/dwrth/tinymce-vyai/icons8-chatbot-64.png" alt="vyAI" style="width: 20px; height: 20px;" />'
 );

 /* Add a button that opens a window */
 editor.ui.registry.addButton('vyai', {
  icon: 'vyai',
  tooltip: editor.translate('vyAI'),
  onAction: function () {
   /* Open window */
   openDialog();
  },
 });

 /* Adds a menu item, which can then be included in any menu via the menu/menubar configuration */
 editor.ui.registry.addMenuItem('vyai', {
  text: editor.translate('vyAI'),
  onAction: function () {
   /* Open window */
   openDialog();
  },
 });

 /* Add context menu item that appears when text is selected */
 editor.ui.registry.addContextToolbar('vyai', {
  predicate: (node) => !editor.selection.isCollapsed(),
  position: 'selection',
  scope: 'node',
  items: [{ label: editor.translate('Edit with vyAI'), items: ['vyai'] }],
 });

 /* Return the metadata for the help plugin */
 return {
  getMetadata: function () {
   return {
    name: 'TinyMCE vyAI Plugin',
    url: 'https://github.com/dwrth',
   };
  },
 };
});
