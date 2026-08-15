"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ExtensionAuthPage() {
  const [status, setStatus] = useState("Preparing session…");
  const [payload, setPayload] = useState("");
  const [extensionId, setExtensionId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") ?? "";
    setExtensionId(id);

    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setStatus("No session found. Sign in first.");
        return;
      }
      const json = JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      });
      setPayload(json);

      const chromeRuntime = (
        window as unknown as {
          chrome?: {
            runtime?: {
              sendMessage: (
                extensionId: string,
                message: unknown,
                cb: () => void,
              ) => void;
              lastError?: { message: string };
            };
          };
        }
      ).chrome?.runtime;

      if (id && chromeRuntime?.sendMessage) {
        chromeRuntime.sendMessage(
          id,
          { type: "SET_SESSION", session: data.session },
          () => {
            if (chromeRuntime.lastError) {
              setStatus(
                "Could not reach the extension automatically. Copy the session JSON into the popup.",
              );
              return;
            }
            setStatus("Extension connected. You can close this tab.");
          },
        );
      } else {
        setStatus(
          "Copy the session JSON below and paste it in the extension popup (or reopen Sign in from the extension).",
        );
      }
    })();
  }, []);

  function copy() {
    void navigator.clipboard.writeText(payload);
    toast.success("Copied session JSON");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Connect the browser extension</h1>
      <p className="text-sm text-muted-foreground">{status}</p>
      {extensionId && (
        <p className="text-xs text-muted-foreground">Extension ID: {extensionId}</p>
      )}
      <Textarea value={payload} readOnly rows={8} />
      <Button onClick={copy} disabled={!payload}>
        Copy session
      </Button>
    </div>
  );
}
