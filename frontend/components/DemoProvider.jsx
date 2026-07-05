'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

const DemoContext = createContext(null);

export function useDemo() {
  return useContext(DemoContext);
}

export default function DemoProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | active | unavailable | error
  const scriptInjected = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE_URL}/api/chat/demo-key`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data && data.clientKey) {
          setStatus('active');
          if (!scriptInjected.current) {
            scriptInjected.current = true;
            const s = document.createElement('script');
            s.src = `${API_BASE_URL}/widget/embed.js`;
            s.setAttribute('data-client', data.clientKey);
            s.setAttribute('data-base-url', API_BASE_URL);
            s.async = true;
            document.body.appendChild(s);
          }
        } else {
          setStatus('unavailable');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function findWidgetIframe() {
    const iframes = document.getElementsByTagName('iframe');
    for (let i = 0; i < iframes.length; i++) {
      if (iframes[i].src && iframes[i].src.indexOf('/widget/chat.html') > -1) return iframes[i];
    }
    return null;
  }

  function openDemoBot() {
    const demoSection = document.getElementById('live-demo');
    if (demoSection) demoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    let tries = 0;
    const interval = setInterval(() => {
      const iframe = findWidgetIframe();
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'ai-support-agent:open' }, '*');
        clearInterval(interval);
      }
      tries += 1;
      if (tries > 20) clearInterval(interval);
    }, 150);
  }

  return <DemoContext.Provider value={{ status, openDemoBot }}>{children}</DemoContext.Provider>;
}
