# tinymce-vyai
Custom tinymce plugin to write, edit, format and style text.

## Usage: 

```ts
// add this to your existing init function
tinymce.init({
  contextmenu: 'vyai',
  external_plugins: {
    vyai: 'https://cdn.jsdelivr.net/gh/dwrth/tinymce-vyai@latest/vyai.js',
  },
  vyai: {
    api_key:
    '<<your-api-key>>',
    // adjust the following parameters to your needs
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 4000,
  },
})
```


Inspired by [tinymce-chatgpt-plugin](https://github.com/The-3Labs-Team/tinymce-chatgpt-plugin)

### Upcoming features:
- [ ] Dropdown list of usefull / common prompts
