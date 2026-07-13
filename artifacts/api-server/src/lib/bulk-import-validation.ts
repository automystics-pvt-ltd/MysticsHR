// Shared pre-flight validation for the employee bulk-import feature.
//
// Both the real import route and the read-only "validate" (dry-run) route
// use this module so the two never drift apart: whatever the validate
// endpoint tells the user is wrong is exactly what would have made the row
// fail (or be silently degraded) on the real import.
//
// Row numbers follow the existing convention used elsewhere in this file:
// `row` is 1-based over the *data* rows of a sheet (i.e. row 1 is the first
// row below the header), matching what the real import's SectionResult
// already reports. Every issue also carries `who` (the row's employeeId,
// when present) so the frontend can show "Row 3 (EMP-014)" instead of
// making the user count rows in Excel to find the right person.

export type RowMap = Record<string, string>;

export type ImportIssue = {
  row: number;
  column?: string;
  who?: string;
  message: string;
  severity: "error" | "warning";
};

export type ImportSheetName =
  | "employees"
  | "profiles"
  | "education"
  | "workExperience"
  | "skills"
  | "certifications"
  | "familyMembers";

export type ImportPayload = Partial<Record<ImportSheetName, RowMap[]>>;

export type ValidationResult = {
  sheets: Record<ImportSheetName, ImportIssue[]>;
  errorCount: number;
  warningCount: number;
};

export type ValidationContext = {
  deptMap: Map<string, number>;
  desigMap: Map<string, number>;
  existingEmployeeIds: Set<string>;
  existingEmails: Set<string>;
};

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const YEAR_RE = /^\d{4}$/;
export const INT_RE = /^\d+$/;
export const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

export const GENDER_VALUES = ["Male", "Female", "Other"];
export const EMPLOYMENT_TYPE_VALUES = ["Permanent", "Contract", "Probation", "Intern", "Part-Time"];
export const STATUS_VALUES = ["Pre-Joining", "Active", "On Leave of Absence", "Suspended", "Notice Period", "Separated"];
export const MARITAL_STATUS_VALUES = ["Single", "Married", "Divorced", "Widowed"];
export const BLOOD_GROUP_VALUES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function validateBulkImportPayload(payload: ImportPayload, ctx: ValidationContext): ValidationResult {
  const sheets: Record<ImportSheetName, ImportIssue[]> = {
    employees: [],
    profiles: [],
    education: [],
    workExperience: [],
    skills: [],
    certifications: [],
    familyMembers: [],
  };

  const employees = payload.employees ?? [];
  const profiles = payload.profiles ?? [];
  const education = payload.education ?? [];
  const workExperience = payload.workExperience ?? [];
  const skills = payload.skills ?? [];
  const certifications = payload.certifications ?? [];
  const familyMembers = payload.familyMembers ?? [];

  function add(sheet: ImportSheetName, row: number, who: string | undefined, severity: "error" | "warning", message: string, column?: string) {
    sheets[sheet].push({ row, who: who || undefined, column, severity, message });
  }

  function addDate(sheet: ImportSheetName, row: number, who: string | undefined, column: string, value: string) {
    add(sheet, row, who, "error", `"${value}" is not a valid date — use the format YYYY-MM-DD (e.g. 2024-01-15)`, column);
  }

  function addEnum(sheet: ImportSheetName, row: number, who: string | undefined, column: string, value: string, allowed: string[]) {
    add(sheet, row, who, "error", `"${value}" is not a valid value for ${column} — use one of: ${allowed.join(", ")}`, column);
  }

  // Track employeeId values declared in this same file so dependent sheets
  // (Profiles, Education, ...) can be checked without ever hitting the DB.
  const fileEmployeeIds = new Set<string>();
  const seenEmployeeIds = new Map<string, number>(); // employeeId -> first row seen
  const seenEmails = new Map<string, number>(); // email (lowercased) -> first row seen

  for (let i = 0; i < employees.length; i++) {
    const r = employees[i];
    const row = i + 1;
    if (!r.employeeId?.trim() && !r.firstName?.trim()) continue; // blank row, ignore

    const empId = r.employeeId?.trim();
    const email = r.email?.trim();
    const who = empId || [r.firstName, r.lastName].filter(Boolean).join(" ").trim();

    if (!empId || !r.firstName?.trim() || !r.lastName?.trim() || !email) {
      add("employees", row, who, "error", "employeeId, firstName, lastName and email are all required");
      continue;
    }

    fileEmployeeIds.add(empId);

    if (!EMAIL_RE.test(email)) {
      add("employees", row, who, "error", `"${email}" does not look like a valid email address`, "email");
    }

    const dupRow = seenEmployeeIds.get(empId);
    if (dupRow !== undefined) {
      add("employees", row, who, "error", `Duplicate employeeId "${empId}" — also used on row ${dupRow}`, "employeeId");
    } else {
      seenEmployeeIds.set(empId, row);
      if (ctx.existingEmployeeIds.has(empId.toLowerCase())) {
        add("employees", row, who, "error", `Employee ID "${empId}" already exists`, "employeeId");
      }
    }

    const emailKey = email.toLowerCase();
    const dupEmailRow = seenEmails.get(emailKey);
    if (dupEmailRow !== undefined) {
      add("employees", row, who, "error", `Duplicate email "${email}" — also used on row ${dupEmailRow}`, "email");
    } else {
      seenEmails.set(emailKey, row);
      if (ctx.existingEmails.has(emailKey)) {
        add("employees", row, who, "error", `Email "${email}" already belongs to another employee`, "email");
      }
    }

    if (r.dateOfBirth?.trim() && !DATE_RE.test(r.dateOfBirth.trim())) addDate("employees", row, who, "dateOfBirth", r.dateOfBirth.trim());
    if (r.dateOfJoining?.trim() && !DATE_RE.test(r.dateOfJoining.trim())) addDate("employees", row, who, "dateOfJoining", r.dateOfJoining.trim());
    if (r.gender?.trim() && !GENDER_VALUES.includes(r.gender.trim())) addEnum("employees", row, who, "gender", r.gender.trim(), GENDER_VALUES);
    if (r.employmentType?.trim() && !EMPLOYMENT_TYPE_VALUES.includes(r.employmentType.trim())) addEnum("employees", row, who, "employmentType", r.employmentType.trim(), EMPLOYMENT_TYPE_VALUES);
    if (r.status?.trim() && !STATUS_VALUES.includes(r.status.trim())) addEnum("employees", row, who, "status", r.status.trim(), STATUS_VALUES);
    if (r.ctc?.trim() && !DECIMAL_RE.test(r.ctc.trim())) add("employees", row, who, "error", `"${r.ctc.trim()}" is not a valid number for ctc`, "ctc");
    if (r.department?.trim() && !ctx.deptMap.has(r.department.trim().toLowerCase())) {
      add("employees", row, who, "warning", `Department "${r.department.trim()}" was not found — it will be left blank. Check the spelling matches an existing department exactly.`, "department");
    }
    if (r.designation?.trim() && !ctx.desigMap.has(r.designation.trim().toLowerCase())) {
      add("employees", row, who, "warning", `Designation "${r.designation.trim()}" was not found — it will be left blank. Check the spelling matches an existing designation exactly.`, "designation");
    }
  }

  // managerEmployeeId can only be resolved once we know every employeeId in
  // this file, so it's checked in a second pass.
  for (let i = 0; i < employees.length; i++) {
    const r = employees[i];
    const row = i + 1;
    const mgr = r.managerEmployeeId?.trim();
    if (!mgr) continue;
    const who = r.employeeId?.trim();
    if (!fileEmployeeIds.has(mgr) && !ctx.existingEmployeeIds.has(mgr.toLowerCase())) {
      add("employees", row, who, "warning", `Manager employeeId "${mgr}" was not found in this file or in existing employees — it will be left blank.`, "managerEmployeeId");
    }
  }

  function checkEmployeeRef(sheet: ImportSheetName, rows: RowMap[]) {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const row = i + 1;
      const empId = r.employeeId?.trim();
      if (!empId) continue;
      if (!fileEmployeeIds.has(empId) && !ctx.existingEmployeeIds.has(empId.toLowerCase())) {
        add(sheet, row, empId, "error", `Employee "${empId}" was not found in the Employees sheet or in existing records — add them to the Employees sheet first, or fix the typo.`, "employeeId");
      }
    }
  }

  checkEmployeeRef("profiles", profiles);
  for (let i = 0; i < profiles.length; i++) {
    const r = profiles[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    const who = r.employeeId.trim();
    if (r.maritalStatus?.trim() && !MARITAL_STATUS_VALUES.includes(r.maritalStatus.trim())) addEnum("profiles", row, who, "maritalStatus", r.maritalStatus.trim(), MARITAL_STATUS_VALUES);
    if (r.bloodGroup?.trim() && !BLOOD_GROUP_VALUES.includes(r.bloodGroup.trim())) addEnum("profiles", row, who, "bloodGroup", r.bloodGroup.trim(), BLOOD_GROUP_VALUES);
    if (r.probationEndDate?.trim() && !DATE_RE.test(r.probationEndDate.trim())) addDate("profiles", row, who, "probationEndDate", r.probationEndDate.trim());
    if (r.confirmationDate?.trim() && !DATE_RE.test(r.confirmationDate.trim())) addDate("profiles", row, who, "confirmationDate", r.confirmationDate.trim());
    if (r.noticePeriodDays?.trim() && !INT_RE.test(r.noticePeriodDays.trim())) {
      add("profiles", row, who, "error", `"${r.noticePeriodDays.trim()}" is not a whole number for noticePeriodDays`, "noticePeriodDays");
    }
    if (r.personalEmail?.trim() && !EMAIL_RE.test(r.personalEmail.trim())) {
      add("profiles", row, who, "warning", `"${r.personalEmail.trim()}" does not look like a valid email address`, "personalEmail");
    }
  }

  checkEmployeeRef("education", education);
  for (let i = 0; i < education.length; i++) {
    const r = education[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    const who = r.employeeId.trim();
    if (!r.degree?.trim() || !r.institution?.trim()) {
      add("education", row, who, "error", "degree and institution are required");
      continue;
    }
    if (r.startYear?.trim() && !YEAR_RE.test(r.startYear.trim())) add("education", row, who, "error", `"${r.startYear.trim()}" is not a valid 4-digit year`, "startYear");
    if (r.endYear?.trim() && !YEAR_RE.test(r.endYear.trim())) add("education", row, who, "error", `"${r.endYear.trim()}" is not a valid 4-digit year`, "endYear");
  }

  checkEmployeeRef("workExperience", workExperience);
  for (let i = 0; i < workExperience.length; i++) {
    const r = workExperience[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    const who = r.employeeId.trim();
    if (!r.company?.trim() || !r.designation?.trim()) {
      add("workExperience", row, who, "error", "company and designation are required");
      continue;
    }
    if (r.startDate?.trim() && !DATE_RE.test(r.startDate.trim())) addDate("workExperience", row, who, "startDate", r.startDate.trim());
    if (r.endDate?.trim() && !DATE_RE.test(r.endDate.trim())) addDate("workExperience", row, who, "endDate", r.endDate.trim());
  }

  checkEmployeeRef("skills", skills);
  for (let i = 0; i < skills.length; i++) {
    const r = skills[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    const who = r.employeeId.trim();
    if (!r.name?.trim()) {
      add("skills", row, who, "error", "name is required");
      continue;
    }
    if (r.yearsOfExperience?.trim() && !INT_RE.test(r.yearsOfExperience.trim())) {
      add("skills", row, who, "error", `"${r.yearsOfExperience.trim()}" is not a whole number for yearsOfExperience`, "yearsOfExperience");
    }
    if (r.lastUsedYear?.trim() && !YEAR_RE.test(r.lastUsedYear.trim())) add("skills", row, who, "error", `"${r.lastUsedYear.trim()}" is not a valid 4-digit year`, "lastUsedYear");
  }

  checkEmployeeRef("certifications", certifications);
  for (let i = 0; i < certifications.length; i++) {
    const r = certifications[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    const who = r.employeeId.trim();
    if (!r.name?.trim() || !r.issuingOrganization?.trim()) {
      add("certifications", row, who, "error", "name and issuingOrganization are required");
      continue;
    }
    if (r.issueDate?.trim() && !DATE_RE.test(r.issueDate.trim())) addDate("certifications", row, who, "issueDate", r.issueDate.trim());
    if (r.expiryDate?.trim() && !DATE_RE.test(r.expiryDate.trim())) addDate("certifications", row, who, "expiryDate", r.expiryDate.trim());
  }

  checkEmployeeRef("familyMembers", familyMembers);
  for (let i = 0; i < familyMembers.length; i++) {
    const r = familyMembers[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    const who = r.employeeId.trim();
    if (!r.name?.trim() || !r.relation?.trim()) {
      add("familyMembers", row, who, "error", "name and relation are required");
      continue;
    }
    if (r.dateOfBirth?.trim() && !DATE_RE.test(r.dateOfBirth.trim())) addDate("familyMembers", row, who, "dateOfBirth", r.dateOfBirth.trim());
    if (r.gender?.trim() && !GENDER_VALUES.includes(r.gender.trim())) {
      add("familyMembers", row, who, "warning", `"${r.gender.trim()}" is not one of Male, Female, Other`, "gender");
    }
  }

  // Errors first, then warnings, within each sheet — so the blocking issues
  // are always what the user sees at the top of the list.
  let errorCount = 0;
  let warningCount = 0;
  for (const key of Object.keys(sheets) as ImportSheetName[]) {
    sheets[key].sort((a, b) => (a.severity === b.severity ? a.row - b.row : a.severity === "error" ? -1 : 1));
    for (const issue of sheets[key]) {
      if (issue.severity === "error") errorCount++;
      else warningCount++;
    }
  }

  return { sheets, errorCount, warningCount };
}
