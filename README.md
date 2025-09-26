# tinymce-vyai

A powerful TinyMCE plugin that integrates AI-powered text editing capabilities directly into your editor. Write, edit, format, and style text with the help of AI using OpenAI's GPT models.

## ✨ Features

### 🤖 AI-Powered Text Editing

- **Smart Content Generation**: Generate content based on custom prompts
- **Grammar & Spelling**: Fix grammar and spelling mistakes automatically
- **Content Rewriting**: Make text more concise, expand with details, or paraphrase
- **Tone Adjustment**: Change text tone to formal, informal, simple, friendly, or assertive
- **Translation**: Translate text to English, German, or French
- **SEO Optimization**: Make content more SEO-friendly
- **Persuasive Writing**: Enhance text to be more persuasive
- **Call-to-Action**: Add compelling calls to action

### 📝 Content Summarization

- **Short Summary**: Get 1-2 sentence summaries
- **Bullet Points**: Convert content to organized bullet points
- **Key Takeaways**: Extract main points and insights

### 🎯 User Experience

- **Context-Aware**: Works with selected text or custom input
- **Preview & Review**: Review generated content before applying
- **Retry Functionality**: Regenerate content with the same prompt
- **Multi-language Support**: Available in English, German, and French
- **Context Toolbar**: Quick access when text is selected
- **Right-click Integration**: Access via context menu

## 🚀 Installation

### CDN (Recommended)

```javascript
tinymce.init({
 selector: '#editor',
 plugins: 'vyai',
 external_plugins: {
  vyai: 'https://cdn.jsdelivr.net/gh/dwrth/tinymce-vyai@main/vyai.js',
 },
 vyai: {
  api_key: 'your-openai-api-key',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 1000,
 },
});
```

### Manual Installation

Download the plugin files and include them in your project.

## 📖 Usage

### Basic Setup

```javascript
tinymce.init({
 selector: '#editor',
 plugins: 'vyai',
 external_plugins: {
  vyai: 'path/to/vyai.js',
 },
 vyai: {
  api_key: 'your-openai-api-key',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 1000,
 },
});
```

### Advanced Configuration

```javascript
tinymce.init({
 selector: '#editor',
 plugins: 'vyai',
 external_plugins: {
  vyai: 'path/to/vyai.js', // or https://cdn.jsdelivr.net/gh/dwrth/tinymce-vyai@main/vyai.js
 },
 vyai: {
  // ⚠️ it is highly recommended to use your own endpoint together with customFetch
  // Adding your key here will make it visible in the developer tools, even if you get it from an environment variable!
  api_key: 'your-openai-api-key',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 1000,
  baseUri: 'https://api.openai.com/v1/chat/completions',
  customFetch: null, // Custom fetch function for advanced use cases
  disabled: false, // Disable the plugin
  tooltipDisabled: 'vyAI is currently disabled',
  prompts: ['Custom prompt 1', 'Custom prompt 2'], // Custom prompt suggestions
 },
});
```

### UI Elements

The plugin adds several UI elements to your editor:

- **Main Button**: `vyai` - Opens the AI prompt dialog
- **Prompts Menu**: `vyai_prompts` - Quick access to common prompts
- **Context Toolbar**: Appears when text is selected
- **Context Menu**: Right-click integration

## 🔧 Configuration Options

| Option        | Type     | Default       | Description                 |
| ------------- | -------- | ------------- | --------------------------- |
| `api_key`     | string   | required      | Your OpenAI API key         |
| `model`       | string   | 'gpt-4o-mini' | OpenAI model to use         |
| `temperature` | number   | 0.7           | Creativity level (0-1)      |
| `max_tokens`  | number   | 1000          | Maximum response length     |
| `baseUri`     | string   | OpenAI API    | Custom API endpoint         |
| `customFetch` | function | null          | Custom fetch implementation |
| `disabled`    | boolean  | false         | Disable the plugin          |
| `prompts`     | array    | []            | Custom prompt suggestions   |

## 🌍 Internationalization

The plugin supports multiple languages:

- English (en)
- German (de)
- French (fr)

Language files are automatically loaded based on your TinyMCE configuration.

## ⚠️ Important Notes

- **API Key Required**: You need a valid OpenAI API key to use this plugin
- **Content Review**: AI-generated content may contain inaccuracies - always review before publishing
- **Rate Limits**: Be aware of OpenAI's API rate limits and usage costs
- **HTML Preservation**: The plugin preserves HTML formatting and styles in your content
