/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { TaskManager } from "./task-manager";
import { ExportStream } from "../utils/streams/export-stream";
import { createZipStream } from "../utils/streams/zip-stream";
import { createWriteStream } from "../utils/stream-saver";

export async function exportToPDF(
  title: string,
  content: string
): Promise<boolean> {
  if (!content) return false;

  return new Promise<boolean>((resolve) => {
    const iframe = document.createElement("iframe");

    iframe.srcdoc = content;
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.loading = "eager";

    iframe.onload = async () => {
      if (!iframe.contentWindow) return;
      if (iframe.contentDocument) iframe.contentDocument.title = title;
      iframe.contentWindow.onbeforeunload = () => closePrint(false);
      iframe.contentWindow.onafterprint = () => closePrint(true);

      if (
        iframe.contentDocument &&
        !!iframe.contentDocument.querySelector(".math-block,.math-inline")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      iframe.contentWindow.print();
    };

    function closePrint(result: boolean) {
      document.body.removeChild(iframe);
      resolve(result);
    }

    document.body.appendChild(iframe);
  });
}

export async function exportNotes(
  format: "pdf" | "md" | "txt" | "html" | "md-frontmatter",
  noteIds: string[]
): Promise<boolean> {
  return await TaskManager.startTask({
    type: "modal",
    title: "Exporting notes",
    subtitle: "Please wait while your notes are exported.",
    action: async (report) => {
      await new ExportStream(noteIds, format, undefined, (c, text) =>
        report({ total: noteIds.length, current: c, text })
      )
        .pipeThrough(createZipStream())
        .pipeTo(await createWriteStream("notes.zip"));
      return true;
    }
  });
}
