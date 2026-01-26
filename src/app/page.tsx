"use client";

import ContentWriterUI from "@/components/ContentWriterUI";
import I18nProvider from "@/components/I18nProvider";

export default function Page() {
  return (
    <I18nProvider>
      <ContentWriterUI />
    </I18nProvider>
  );
}
