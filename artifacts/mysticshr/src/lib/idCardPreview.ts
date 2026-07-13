// Opens the ID card's HTML preview (same branding/fields as the downloadable PDF) in a new tab.
export async function previewIdCard(employeeId: number) {
  try {
    const res = await fetch(`/api/employees/${employeeId}/id-card/preview`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load preview");
    const { html } = await res.json();
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  } catch {
    window.alert("Could not load the ID card preview.");
  }
}
