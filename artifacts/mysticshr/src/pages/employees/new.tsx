import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useListDepartments,
  useListDesignations,
  useListEmployees,
  useGetShiftsTemplates,
  useGetEmployeeIdConfig,
  getListEmployeesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, UserPlus } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const EMPLOYMENT_TYPES = ["Permanent", "Contract", "Probation", "Intern", "Part-Time"] as const;
const STATUSES = ["Pre-Joining", "Active", "On Leave of Absence", "Suspended", "Notice Period", "Separated"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  idMode: "auto" | "manual";
  phone: string;
  dateOfBirth: string;
  gender: string;
  location: string;
  departmentId: string;
  designationId: string;
  managerId: string;
  branchId: string;
  defaultShiftTemplateId: string;
  employmentType: typeof EMPLOYMENT_TYPES[number];
  status: typeof STATUSES[number];
  dateOfJoining: string;
  ctc: string;
  notes: string;
}

const today = new Date().toISOString().slice(0, 10);

function suggestEmployeeId(): string {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `AMT-${year}-${rand}`;
}

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  employeeId: suggestEmployeeId(),
  idMode: "manual",
  phone: "",
  dateOfBirth: "",
  gender: "",
  location: "Chennai",
  departmentId: "",
  designationId: "",
  managerId: "",
  branchId: "",
  defaultShiftTemplateId: "",
  employmentType: "Permanent",
  status: "Pre-Joining",
  dateOfJoining: today,
  ctc: "",
  notes: "",
};

export default function NewEmployeePage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: deptResp } = useListDepartments();
  const { data: desigResp } = useListDesignations();
  const { data: empResp } = useListEmployees({ limit: 200 });
  const { data: branchList = [] } = useQuery<any[]>({
    queryKey: ["branches"],
    queryFn: () => fetch(`${BASE_URL}/api/branches`, { credentials: "include" }).then((r) => r.json()),
  });
  const { data: shiftResp } = useGetShiftsTemplates();
  const { data: idConfig } = useGetEmployeeIdConfig();
  const idPrefix = idConfig?.employeeIdPrefix?.trim() || null;
  const nextEmployeeId = idConfig?.nextEmployeeId ?? null;
  const [idModeTouched, setIdModeTouched] = useState(false);

  // Once the tenant's configured prefix loads: default to auto-generation
  // (the recommended path) and, for tenants without a prefix, fall back to
  // the old manual-entry suggestion so the field isn't blank.
  useEffect(() => {
    if (idModeTouched) return;
    if (idPrefix) {
      setForm((prev) => ({ ...prev, idMode: "auto" }));
    } else if (form.employeeId === initialState.employeeId) {
      // No prefix configured — nothing to auto-generate from; keep manual.
      setForm((prev) => ({ ...prev, idMode: "manual" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPrefix, idModeTouched]);

  function setIdMode(mode: "auto" | "manual") {
    setIdModeTouched(true);
    setForm((prev) => ({
      ...prev,
      idMode: mode,
      // Seed the manual field with the prefix hint the first time the user
      // switches to manual entry, so they aren't starting from a blank box.
      employeeId: mode === "manual" && prev.employeeId === initialState.employeeId && idPrefix
        ? `${idPrefix}-${new Date().getFullYear()}-`
        : prev.employeeId,
    }));
  }

  const departments = (Array.isArray(deptResp) ? deptResp : (deptResp as any)?.data) ?? [];
  const designations = (Array.isArray(desigResp) ? desigResp : (desigResp as any)?.data) ?? [];
  const employees = (Array.isArray(empResp) ? empResp : (empResp as any)?.data) ?? [];
  const branches = Array.isArray(branchList) ? branchList : [];
  const shiftTemplates = (Array.isArray(shiftResp) ? shiftResp : (shiftResp as any)?.data) ?? [];

  const filteredDesignations = form.departmentId
    ? designations.filter((d: any) => String(d.departmentId) === form.departmentId)
    : designations;

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    if (key === "departmentId") {
      setForm((prev) => ({ ...prev, departmentId: val as string, designationId: "" }));
    } else {
      setForm((prev) => ({ ...prev, [key]: val }));
    }
  }

  const usingAutoId = form.idMode === "auto" && !!idPrefix;

  const validate = (): string | null => {
    if (!form.firstName.trim()) return "First name is required";
    if (!form.lastName.trim()) return "Last name is required";
    if (!form.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email is not valid";
    if (!usingAutoId && !form.employeeId.trim()) return "Employee ID is required";
    if (form.ctc && Number.isNaN(Number(form.ctc))) return "CTC must be a valid number";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    const v = validate();
    if (v) { setError(v); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = usingAutoId
        ? { autoGenerateId: true }
        : { employeeId: form.employeeId.trim() };
      Object.assign(payload, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        employmentType: form.employmentType,
        status: form.status,
      });
      if (form.phone) payload.phone = form.phone.trim();
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.gender) payload.gender = form.gender;
      if (form.departmentId) payload.departmentId = Number(form.departmentId);
      if (form.designationId) payload.designationId = Number(form.designationId);
      if (form.dateOfJoining) payload.dateOfJoining = form.dateOfJoining;
      if (form.ctc) payload.ctc = form.ctc;
      if (form.managerId) payload.managerId = Number(form.managerId);
      if (form.location) payload.location = form.location.trim();
      if (form.branchId) payload.branchId = Number(form.branchId);
      if (form.defaultShiftTemplateId) payload.defaultShiftTemplateId = Number(form.defaultShiftTemplateId);

      const resp = await fetch(`${BASE_URL}/api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${resp.status})`);
      }

      const created = await resp.json();
      setSuccess(`Employee ${created.firstName} ${created.lastName} (${created.employeeId}) created successfully.`);
      qc.invalidateQueries({ queryKey: getListEmployeesQueryKey() });

      setTimeout(() => navigate(`/employees/${created.id}`), 900);
    } catch (err: any) {
      setError(err?.message || "Failed to create employee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/employees")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Employees
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primary" /> New Employee
          </h1>
          <p className="text-sm text-muted-foreground">
            Fields marked <span className="text-destructive font-medium">*</span> are required.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <CheckCircle2 className="w-4 h-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic Identity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Name and contact details</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
              <Input id="firstName" value={form.firstName} autoFocus
                onChange={(e) => update("firstName", e.target.value)} placeholder="e.g. Priya" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
              <Input id="lastName" value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)} placeholder="e.g. Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work Email <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" value={form.email}
                onChange={(e) => update("email", e.target.value)} placeholder="firstname.lastname@automystics.com" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="employeeId">Employee ID <span className="text-destructive">*</span></Label>
                {idPrefix && (
                  <div className="flex items-center gap-1 rounded-md border p-0.5 text-xs">
                    <button type="button"
                      className={`rounded px-2 py-1 ${form.idMode === "auto" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                      onClick={() => setIdMode("auto")}>
                      Auto
                    </button>
                    <button type="button"
                      className={`rounded px-2 py-1 ${form.idMode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                      onClick={() => setIdMode("manual")}>
                      Manual
                    </button>
                  </div>
                )}
              </div>
              {usingAutoId ? (
                <>
                  <Input id="employeeId" value={nextEmployeeId ?? "Generating…"} disabled readOnly />
                  <p className="text-xs text-muted-foreground">
                    Auto-assigned using this tenant's "{idPrefix}" prefix and next available sequence number.
                  </p>
                </>
              ) : (
                <>
                  <Input id="employeeId" value={form.employeeId}
                    onChange={(e) => update("employeeId", e.target.value)} placeholder={idPrefix ? `${idPrefix}-2026-001` : "AMT-2026-001"} />
                  <p className="text-xs text-muted-foreground">
                    {idPrefix
                      ? `Must start with this tenant's "${idPrefix}" prefix — enter the rest yourself`
                      : "Auto-suggested — edit if needed"}
                  </p>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone}
                onChange={(e) => update("phone", e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc">Work Location</Label>
              <Input id="loc" value={form.location}
                onChange={(e) => update("location", e.target.value)} placeholder="Chennai" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={form.dateOfBirth}
                onChange={(e) => update("dateOfBirth", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender || undefined} onValueChange={(v) => update("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Position */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Role & Reporting</CardTitle>
            <CardDescription>Department, designation, and reporting manager</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.departmentId || undefined} onValueChange={(v) => update("departmentId", v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Select
                value={form.designationId || undefined}
                onValueChange={(v) => update("designationId", v)}
                disabled={filteredDesignations.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.departmentId ? "Select designation" : "Select department first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredDesignations.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reporting Manager</Label>
              <Select value={form.managerId || undefined} onValueChange={(v) => update("managerId", v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.firstName} {e.lastName} — {e.employeeId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Branch / Office</Label>
              <Select value={form.branchId || undefined} onValueChange={(v) => update("branchId", v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}{b.city ? ` — ${b.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Default Shift</Label>
              <Select value={form.defaultShiftTemplateId || undefined} onValueChange={(v) => update("defaultShiftTemplateId", v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {shiftTemplates.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}{s.startTime ? ` (${s.startTime}–${s.endTime})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Employment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Employment Details</CardTitle>
            <CardDescription>Type, status, dates, and compensation</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Employment Type <span className="text-destructive">*</span></Label>
              <Select value={form.employmentType} onValueChange={(v) => update("employmentType", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status <span className="text-destructive">*</span></Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doj">Date of Joining</Label>
              <Input id="doj" type="date" value={form.dateOfJoining}
                onChange={(e) => update("dateOfJoining", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ctc">Annual CTC (₹)</Label>
              <Input id="ctc" type="number" step="0.01" value={form.ctc}
                onChange={(e) => update("ctc", e.target.value)} placeholder="e.g. 1200000" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea id="notes" rows={2} value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Optional context for HR — not visible to employee" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => navigate("/employees")} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitting ? "Creating…" : "Create Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
}
