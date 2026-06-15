"use client";

import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/primitives";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (isIos()) {
        setShowIosHint(true);
        return;
      }
    }, 0);

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (isStandalone() || dismissed) {
    return null;
  }

  if (showIosHint && isIos()) {
    return (
      <aside className="no-print fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-[#d6a84f]/40 bg-[#1a1510]/95 p-4 shadow-2xl backdrop-blur">
        <p className="text-sm font-bold text-[#f3c96b]">تثبيت التطبيق على iPhone</p>
        <p className="mt-2 text-xs leading-relaxed text-white/70">
          اضغط زر المشاركة في Safari ثم اختر «إضافة إلى الشاشة الرئيسية» لتشغيل baraa raed كتطبيق.
        </p>
        <div className="mt-3 flex justify-end">
          <SecondaryButton onClick={() => setDismissed(true)}>لاحقاً</SecondaryButton>
        </div>
      </aside>
    );
  }

  if (!deferred) {
    return null;
  }

  return (
    <aside className="no-print fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-[#d6a84f]/40 bg-[#1a1510]/95 p-4 shadow-2xl backdrop-blur">
      <p className="text-sm font-bold text-[#f3c96b]">تثبيت تطبيق المعرض</p>
      <p className="mt-2 text-xs text-white/70">
        ثبّت baraa raed على سطح المكتب أو الهاتف للوصول السريع ودعم العمل دون اتصال.
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <SecondaryButton onClick={() => setDismissed(true)}>لاحقاً</SecondaryButton>
        <PrimaryButton
          onClick={() => {
            void deferred.prompt();
            void deferred.userChoice.then(() => setDismissed(true));
          }}
        >
          تثبيت الآن
        </PrimaryButton>
      </div>
    </aside>
  );
}
