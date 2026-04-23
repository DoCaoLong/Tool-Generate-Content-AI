import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            // Header
            appTitle: "Content Builder",
            appDescription: "Paste a URL, choose options, generate a clean prompt.",
            darkMode: "Dark mode",

            // Provider & Keys
            providerKeys: "Provider & Keys",
            provider: "Provider",
            apiKey: "API Key",
            model: "Model",
            save: "Save",
            delete: "Delete",
            cancel: "Cancel",
            validating: "Validating...",
            getOpenAIKey: "Get OpenAI key",
            getGeminiKey: "Get Gemini key",
            enterApiKey: "Enter your API key",

            // Inputs
            inputs: "Inputs",
            rewriteBasedOnContent: "Rewrite based on content",
            writeNew: "Write new",
            textToRewrite: "Text to rewrite",
            pasteText: "Paste the text you want to rewrite...",
            textPlacedUnder: "This text will be placed under",
            text: "text",
            inPrompt: "in the generated prompt.",
            inWriteNewMode: "In",
            writeNewModeStrong: "Write new",
            writeNewDescription: "mode, the prompt will ask for a brand new post inspired by the linked page. No source text is required.",
            websiteLink: "Website link",
            websiteLinkPlaceholder: "https://example.com/article",
            invalidUrl: "Invalid URL. Example: https://domain.com/page",
            requiredKeywords: "Required keywords",
            commaOrNewLine: "Comma or new line",
            keywordsPlaceholder: "@nirvana_fi, $SOL, $ANA",
            outputLanguage: "Output language",
            selectLanguage: "Select language",
            writingStyle: "Writing style",
            selectStyle: "Select style",
            length: "Length",
            selectLength: "Select length",
            customWordCount: "Custom word count",
            customWordPlaceholder: "e.g. 220",
            customWordDescription: "Enabled only when Length is set to Custom.",
            customStyleNotes: "Custom style notes",
            customStylePlaceholder: "Optional, e.g. keep it calm, avoid hype, use short lines...",
            customStyleDescription: "These notes will be injected into the prompt under",
            customStyle: "custom_style",

            // Buttons
            generateContent: "Generate Content",
            generating: "Generating...",
            reset: "Reset",

            // Output
            output: "Output",
            copy: "Copy",
            clear: "Clear",
            generatedPromptPlaceholder: "Generated prompt will appear here...",
            whatThisAppGenerates: "What this app generates",
            whatThisAppDescription: "A single JSON prompt that includes your URL, mode selection, required keywords, language, style preferences, and the default rewrite rules. You can paste it directly into your model call.",

            // Toast messages
            copiedToClipboard: "Copied to clipboard",
            copyFailed: "Copy failed",
            cleared: "Cleared",
            promptGenerated: "Prompt generated",
            settingsSaved: "Settings saved successfully",
            pleaseEnterApiKey: "Please enter an API key",
            pleaseEnterValidUrl: "Please enter a valid URL",
            contentGenerated: "Content generated",
            generationFailed: "Generation failed",
            inputsReset: "Inputs reset",

            // Footer
            madeBy: "Made by",

            // Languages
            english: "English",
            vietnamese: "Tiếng Việt",
            chinese: "中文",
            japanese: "日本語",
            korean: "한국어",
            spanish: "Español",
            french: "Français",

            // Writing Styles
            styleCasual: "Casual (natural)",
            styleProfessional: "Professional",
            styleEducational: "Educational",
            styleStorytelling: "Storytelling",
            styleThread: "X/Twitter post",
            styleFormal: "Formal",

            // Length Options
            lengthShort: "Short",
            lengthMedium: "Medium",
            lengthLong: "Long",
            lengthCustom: "Custom (words)",

            // Models
            openai: "OpenAI",
            gemini: "Gemini",

            // Templates
            template: "Template",
            saveTemplate: "Save Template",
            templateNamePlaceholder: "e.g. My Writing Style",
            templateName: "Template Name",
            templateNote: "Save your current settings as a template to quickly reuse later.",

            // History
            history: "History",
            historyNote: "Automatically saves your last 10 generations. Click any item to restore settings and output.",
            clearAll: "Clear All",
            noHistory: "No history yet. Generate content to see history here.",
            generatedAt: "Generated at",
            historyItemsCount: "items",
            historyItemLoaded: "History item loaded!",
            historyCleared: "History cleared!",

            // KOL Selector
            kolWritingStyle: "KOL Writing Style",
            kolClear: "Clear",
            kolStyleInjected: "Writing style of",
            kolStyleInjectedSuffix: "will be injected into your prompt.",
            kolViewStyle: "View style",
            kolNoStyle: "No style summary available.",
            kolClose: "Close",
            kolUseStyle: "Use {{name}}'s style",
            kolDeselect: "Deselect",
            kolDialogDesc: "Writing style summary for {{name}}",
        },
    },
    vi: {
        translation: {
            // Header
            appTitle: "Content Builder",
            appDescription: "Dán URL, chọn tùy chọn, tạo prompt sạch.",
            darkMode: "Chế độ tối",

            // Provider & Keys
            providerKeys: "Provider & Keys",
            provider: "Provider",
            apiKey: "API Key",
            model: "Model",
            save: "Lưu",
            delete: "Xóa",
            cancel: "Hủy",
            validating: "Đang xác thực...",
            getOpenAIKey: "Lấy OpenAI key",
            getGeminiKey: "Lấy Gemini key",
            enterApiKey: "Nhập API key của bạn",

            // Inputs
            inputs: "Inputs",
            rewriteBasedOnContent: "Viết lại dựa trên nội dung",
            writeNew: "Viết mới",
            textToRewrite: "Văn bản cần viết lại",
            pasteText: "Dán văn bản bạn muốn viết lại...",
            textPlacedUnder: "Văn bản này sẽ được đặt dưới",
            text: "text",
            inPrompt: "trong prompt được tạo.",
            inWriteNewMode: "Ở chế độ",
            writeNewModeStrong: "Viết mới",
            writeNewDescription: ", prompt sẽ yêu cầu một bài viết hoàn toàn mới lấy cảm hứng từ trang được liên kết. Không cần văn bản nguồn.",
            websiteLink: "Link website",
            websiteLinkPlaceholder: "https://example.com/article",
            invalidUrl: "URL không hợp lệ. Ví dụ: https://domain.com/page",
            requiredKeywords: "Từ khóa bắt buộc",
            commaOrNewLine: "Dấu phẩy hoặc xuống dòng",
            keywordsPlaceholder: "@nirvana_fi, $SOL, $ANA",
            outputLanguage: "Ngôn ngữ đầu ra",
            selectLanguage: "Chọn ngôn ngữ",
            writingStyle: "Phong cách viết",
            selectStyle: "Chọn phong cách",
            length: "Độ dài",
            selectLength: "Chọn độ dài",
            customWordCount: "Số từ tùy chỉnh",
            customWordPlaceholder: "vd. 220",
            customWordDescription: "Chỉ bật khi Độ dài được đặt thành Tùy chỉnh.",
            customStyleNotes: "Ghi chú phong cách tùy chỉnh",
            customStylePlaceholder: "Tùy chọn, vd. giữ bình tĩnh, tránh cường điệu, dùng câu ngắn...",
            customStyleDescription: "Những ghi chú này sẽ được đưa vào cuối prompt",
            customStyle: "custom_style",

            // Buttons
            generateContent: "Tạo Nội Dung",
            generating: "Đang tạo...",
            reset: "Đặt lại",

            // Output
            output: "Output",
            copy: "Sao chép",
            clear: "Xóa",
            generatedPromptPlaceholder: "Prompt được tạo sẽ xuất hiện ở đây...",
            whatThisAppGenerates: "App này tạo ra gì",
            whatThisAppDescription: "Một prompt JSON duy nhất bao gồm URL, chế độ đã chọn, từ khóa bắt buộc, ngôn ngữ, tùy chọn phong cách và các quy tắc viết lại mặc định. Bạn có thể dán trực tiếp vào lệnh gọi model.",

            // Toast messages
            copiedToClipboard: "Đã sao chép vào clipboard",
            copyFailed: "Sao chép thất bại",
            cleared: "Đã xóa",
            promptGenerated: "Đã tạo prompt",
            settingsSaved: "Đã lưu cài đặt thành công",
            pleaseEnterApiKey: "Vui lòng nhập API key",
            pleaseEnterValidUrl: "Vui lòng nhập URL hợp lệ",
            contentGenerated: "Đã tạo nội dung",
            generationFailed: "Tạo nội dung thất bại",
            inputsReset: "Đã đặt lại inputs",

            // Footer
            madeBy: "Được tạo bởi",

            // Languages
            english: "English",
            vietnamese: "Tiếng Việt",
            chinese: "中文",
            japanese: "日本語",
            korean: "한국어",
            spanish: "Español",
            french: "Français",

            // Writing Styles
            styleCasual: "Thông thường (tự nhiên)",
            styleProfessional: "Chuyên nghiệp",
            styleEducational: "Giáo dục",
            styleStorytelling: "Kể chuyện",
            styleThread: "Bài viết X/Twitter",
            styleFormal: "Trang trọng",

            // Length Options
            lengthShort: "Ngắn",
            lengthMedium: "Trung bình",
            lengthLong: "Dài",
            lengthCustom: "Tùy chỉnh (số từ)",

            // Models
            openai: "OpenAI",
            gemini: "Gemini",

            // Templates
            template: "Mẫu",
            saveTemplate: "Lưu Mẫu",
            templateNamePlaceholder: "vd. Phong cách viết của tôi",
            templateName: "Tên mẫu",
            templateNote: "Lưu cài đặt hiện tại của bạn dưới dạng mẫu để tái sử dụng nhanh sau này.",

            // History
            history: "Lịch sử",
            historyNote: "Tự động lưu 10 lần tạo gần nhất. Nhấp vào bất kỳ mục nào để khôi phục cài đặt và kết quả.",
            clearAll: "Xóa tất cả",
            noHistory: "Chưa có lịch sử. Tạo nội dung để xem lịch sử ở đây.",
            generatedAt: "Tạo lúc",
            historyItemsCount: "mục",
            historyItemLoaded: "Đã tải mục lịch sử!",
            historyCleared: "Đã xóa lịch sử!",

            // KOL Selector
            kolWritingStyle: "Phong cách viết KOL",
            kolClear: "Bỏ chọn",
            kolStyleInjected: "Phong cách viết của",
            kolStyleInjectedSuffix: "sẽ được tích hợp vào prompt.",
            kolViewStyle: "Xem phong cách",
            kolNoStyle: "Chưa có mô tả phong cách.",
            kolClose: "Đóng",
            kolUseStyle: "Dùng phong cách {{name}}",
            kolDeselect: "Bỏ chọn",
            kolDialogDesc: "Tóm tắt phong cách viết của {{name}}",
        },
    },
};

// Initialize i18n with default language
i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // Default to English
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
