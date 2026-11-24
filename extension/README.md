# ResumeIQ Chrome extension

A Manifest V3 extension that opens ResumeIQ in Chrome's right-hand side panel.
It's plain JavaScript. The one built piece is the PDF generator in `sidepanel/vendor/`, which is
bundled from the client's resume code so the PDFs match the web app exactly.

## Store description

`manifest.json` holds a short description, because Chrome limits it to 132 characters. Use this full
text for the Chrome Web Store listing:

> A sniper never takes a shot without analyzing the target. Your job application should be no different.
>
> ResumeIQ transforms your resume into a precision-tailored application, aligning your skills, experience, and qualifications with every target job description.
>
> No guesswork. No generic resumes. Just strategic positioning and intelligent targeting.
>
> Identify the target. Align your strengths. Apply with precision.

## Run it locally

1. Start the server (`cd server && npm run dev`) and the client (`cd client && npm run dev`).
2. Build the PDF generator: `cd client && npm run build:extension`. Run it again whenever the resume layout in `client/src/resume/` changes.
3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick this `extension/` folder.
4. Click the ResumeIQ toolbar icon. The side panel opens.

## Downloading PDFs from the side panel

First click **Choose…** next to *Download folder* and pick a folder. The panel keeps the folder
handle in IndexedDB (File System Access API, see [lib/downloadFolder.js](lib/downloadFolder.js)), so the
choice survives restarts. Chrome may ask again for write access after a restart; allow it.

Each PDF is saved to `<download folder>/<company_target>/<file name>`. `company_target` comes from the
JSON (both prompts ask for it), with characters that aren't allowed in folder names removed. When
`company_target` is missing, blank or `Unknown`, a dialog asks for the company name (Cancel saves
nothing). The panel shows an alert and saves nothing when:

- no download folder is set, or write access was denied,
- the file already exists in that company folder (it's never overwritten).

Copy the AI's output, then click a button in the panel:

- **Resume**: the clipboard must hold resume JSON (a ```json fence is fine). It's checked for a `personal_info.name` and some content, then saved as `Full_Name_Resume.pdf`.
- **Cover letter**: the clipboard must hold cover letter JSON (`personal_info`, `headline`, `online_presence`, `cover_letter`) with a non-empty `cover_letter`. The letter goes under a **Cover Letter** section, below a header from the JSON (blank fields are filled from your profile), and is saved as `Full_Name_Cover_Letter.pdf`.

Both use your saved resume customization (font, sizes, margins, theme, header layout). The settings, profile and generator are loaded when the panel's home view opens.
The generator needs WebAssembly, so `manifest.json` allows `'wasm-unsafe-eval'` for extension pages.

## How the session is shared

The server keeps the login in an httpOnly `token` cookie. The extension doesn't store tokens.
It calls the same `${APP_URL}/api/...` endpoints as the web client, with `credentials: 'include'`.

- `host_permissions` for the app origin lets Chrome attach the app's cookies to the extension's requests. Chrome treats these requests as same-site, so the `SameSite=Lax` cookie is sent, and it doesn't apply CORS to them.
- When you sign in from the panel (`POST /api/auth/login`), the server sets the cookie in the browser's normal cookie jar. The web app is then signed in too, and the reverse is also true.
- The panel listens for changes to the `token` cookie through `chrome.cookies.onChanged`. When you sign in or out in a web tab, the panel updates right away. It also calls `/api/auth/me` again whenever it becomes visible.

## Pointing at another environment

Change `APP_URL` in [lib/config.js](lib/config.js). Then change `host_permissions` in [manifest.json](manifest.json) to match, for example `"https://app.example.com/*"`, and reload the extension.

## Files

| Path | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest: side panel, permissions |
| `background.js` | Makes a toolbar click open the side panel; builds the theme color and resume prompt for the content script |
| `content/chatgpt.js` | Resume / Cover letter buttons above the ChatGPT input, followed by a pencil Q/A button. Resume sends the prompt plus the job description from the clipboard; Q/A sends the prompt saved on the app's AI Prompt page (`GET /api/prompts`) |
| `lib/aiPrompt.js`, `lib/constants.js` | Resume prompt builder (copy of `client/src/aiPrompt.js` and its constants) |
| `lib/themes.js` | Resume color themes (copy of `client/src/resume/options.js`) |
| `lib/config.js` | App URL and the name of the session cookie |
| `lib/api.js` | Fetch wrapper (mirrors `client/src/api/client.js`) |
| `lib/downloadFolder.js` | Remembers the download folder and writes PDFs into its company subfolders |
| `lib/auth.js` | `getCurrentUser`, `login`, `logout`, `onSessionChange` |
| `sidepanel/` | Panel UI, including the PDF download buttons |
| `sidepanel/vendor/` | Generated PDF generator (`client/src/resume/exportPdf.jsx`), not committed |
