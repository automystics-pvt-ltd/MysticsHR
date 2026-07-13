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
// already reports.

export type RowMap = Record<string, string>;

export type ImportIssue = {
  row: number;
  column?: string;
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

function dateIssue(row: number, column: string, value: string): ImportIssue {
  return {
    row,
    column,
    severity: "error",
    message: `"${value}" is not a valid date — use the format YYYY-MM-DD (e.g. 2024-01-15)`,
  };
}

function enumIssue(row: number, column: string, value: string, allowed: string[]): ImportIssue {
  return {
    row,
    column,
    severity: "error",
    message: `"${value}" is not a valid value for ${column} — use one of: ${allowed.join(", ")}`,
  };
}

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

    if (!empId || !r.firstName?.trim() || !r.lastName?.trim() || !email) {
      sheets.employees.push({
        row,
        severity: "error",
        message: "employeeId, firstName, lastName and email are all required",
      });
      continue;
    }

    fileEmployeeIds.add(empId);

    if (!EMAIL_RE.test(email)) {
      sheets.employees.push({ row, column: "email", severity: "error", message: `"${email}" does not look like a valid email address` });
    }

    const dupRow = seenEmployeeIds.get(empId);
    if (dupRow !== undefined) {
      sheets.employees.push({ row, column: "employeeId", severity: "error", message: `Duplicate employeeId "${empId}" — also used on row ${dupRow}` });
    } else {
      seenEmployeeIds.set(empId, row);
      if (ctx.existingEmployeeIds.has(empId.toLowerCase())) {
        sheets.employees.push({ row, column: "employeeId", severity: "error", message: `Employee ID "${empId}" already exists` });
      }
    }

    const emailKey = email.toLowerCase();
    const dupEmailRow = seenEmails.get(emailKey);
    if (dupEmailRow !== undefined) {
      sheets.employees.push({ row, column: "email", severity: "error", message: `Duplicate email "${email}" — also used on row ${dupEmailRow}` });
    } else {
      seenEmails.set(emailKey, row);
      if (ctx.existingEmails.has(emailKey)) {
        sheets.employees.push({ row, column: "email", severity: "error", message: `Email "${email}" already belongs to another employee` });
      }
    }

    if (r.dateOfBirth?.trim() && !DATE_RE.test(r.dateOfBirth.trim())) {
      sheets.employees.push(dateIssue(row, "dateOfBirth", r.dateOfBirth.trim()));
    }
    if (r.dateOfJoining?.trim() && !DATE_RE.test(r.dateOfJoining.trim())) {
      sheets.employees.push(dateIssue(row, "dateOfJoining", r.dateOfJoining.trim()));
    }
    if (r.gender?.trim() && !GENDER_VALUES.includes(r.gender.trim())) {
      sheets.employees.push(enumIssue(row, "gender", r.gender.trim(), GENDER_VALUES));
    }
    if (r.employmentType?.trim() && !EMPLOYMENT_TYPE_VALUES.includes(r.employmentType.trim())) {
      sheets.employees.push(enumIssue(row, "employmentType", r.employmentType.trim(), EMPLOYMENT_TYPE_VALUES));
    }
    if (r.status?.trim() && !STATUS_VALUES.includes(r.status.trim())) {
      sheets.employees.push(enumIssue(row, "status", r.status.trim(), STATUS_VALUES));
    }
    if (r.ctc?.trim() && !DECIMAL_RE.test(r.ctc.trim())) {
      sheets.employees.push({ row, column: "ctc", severity: "error", message: `"${r.ctc.trim()}" is not a valid number for ctc` });
    }
    if (r.department?.trim() && !ctx.deptMap.has(r.department.trim().toLowerCase())) {
      sheets.employees.push({ row, column: "department", severity: "warning", message: `Department "${r.department.trim()}" was not found — it will be left blank. Check the spelling matches an existing department exactly.` });
    }
    if (r.designation?.trim() && !ctx.desigMap.has(r.designation.trim().toLowerCase())) {
      sheets.employees.push({ row, column: "designation", severity: "warning", message: `Designation "${r.designation.trim()}" was not found — it will be left blank. Check the spelling matches an existing designation exactly.` });
    }
  }

  // managerEmployeeId can only be resolved once we know every employeeId in
  // this file, so it's checked in a second pass.
  for (let i = 0; i < employees.length; i++) {
    const r = employees[i];
    const row = i + 1;
    const mgr = r.managerEmployeeId?.trim();
    if (!mgr) continue;
    if (!fileEmployeeIds.has(mgr) && !ctx.existingEmployeeIds.has(mgr.toLowerCase())) {
      sheets.employees.push({ row, column: "managerEmployeeId", severity: "warning", message: `Manager employeeId "${mgr}" was not found in this file or in existing employees — it will be left blank.` });
    }
  }

  function checkEmployeeRef(sheet: ImportSheetName, rows: RowMap[]) {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const row = i + 1;
      const empId = r.employeeId?.trim();
      if (!empId) continue;
      if (!fileEmployeeIds.has(empId) && !ctx.existingEmployeeIds.has(empId.toLowerCase())) {
        sheets[sheet].push({ row, column: "employeeId", severity: "error", message: `Employee "${empId}" was not found in the Employees sheet or in existing records — add them to the Employees sheet first, or fix the typo.` });
      }
    }
  }

  checkEmployeeRef("profiles", profiles);
  for (let i = 0; i < profiles.length; i++) {
    const r = profiles[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    if (r.maritalStatus?.trim() && !MARITAL_STATUS_VALUES.includes(r.maritalStatus.trim())) {
      sheets.profiles.push(enumIssue(row, "maritalStatus", r.maritalStatus.trim(), MARITAL_STATUS_VALUES));
    }
    if (r.bloodGroup?.trim() && !BLOOD_GROUP_VALUES.includes(r.bloodGroup.trim())) {
      sheets.profiles.push(enumIssue(row, "bloodGroup", r.bloodGroup.trim(), BLOOD_GROUP_VALUES));
    }
    if (r.probationEndDate?.trim() && !DATE_RE.test(r.probationEndDate.trim())) {
      sheets.profiles.push(dateIssue(row, "probationEndDate", r.probationEndDate.trim()));
    }
    if (r.confirmationDate?.trim() && !DATE_RE.test(r.confirmationDate.trim())) {
      sheets.profiles.push(dateIssue(row, "confirmationDate", r.confirmationDate.trim()));
    }
    if (r.noticePeriodDays?.trim() && !INT_RE.test(r.noticePeriodDays.trim())) {
      sheets.profiles.push({ row, column: "noticePeriodDays", severity: "error", message: `"${r.noticePeriodDays.trim()}" is not a whole number for noticePeriodDays` });
    }
    if (r.personalEmail?.trim() && !EMAIL_RE.test(r.personalEmail.trim())) {
      sheets.profiles.push({ row, column: "personalEmail", severity: "warning", message: `"${r.personalEmail.trim()}" does not look like a valid email address` });
    }
  }

  checkEmployeeRef("education", education);
  for (let i = 0; i < education.length; i++) {
    const r = education[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    if (!r.degree?.trim() || !r.institution?.trim()) {
      sheets.education.push({ row, severity: "error", message: "degree and institution are required" });
      continue;
    }
    if (r.startYear?.trim() && !YEAR_RE.test(r.startYear.trim())) {
      sheets.education.push({ row, column: "startYear", severity: "error", message: `"${r.startYear.trim()}" is not a valid 4-digit year` });
    }
    if (r.endYear?.trim() && !YEAR_RE.test(r.endYear.trim())) {
      sheets.education.push({ row, column: "endYear", severity: "error", message: `"${r.endYear.trim()}" is not a valid 4-digit year` });
    }
  }

  checkEmployeeRef("workExperience", workExperience);
  for (let i = 0; i < workExperience.length; i++) {
    const r = workExperience[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    if (!r.company?.trim() || !r.designation?.trim()) {
      sheets.workExperience.push({ row, severity: "error", message: "company and designation are required" });
      continue;
    }
    if (r.startDate?.trim() && !DATE_RE.test(r.startDate.trim())) {
      sheets.workExperience.push(dateIssue(row, "startDate", r.startDate.trim()));
    }
    if (r.endDate?.trim() && !DATE_RE.test(r.endDate.trim())) {
      sheets.workExperience.push(dateIssue(row, "endDate", r.endDate.trim()));
    }
  }

  checkEmployeeRef("skills", skills);
  for (let i = 0; i < skills.length; i++) {
    const r = skills[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    if (!r.name?.trim()) {
      sheets.skills.push({ row, severity: "error", message: "name is required" });
      continue;
    }
    if (r.yearsOfExperience?.trim() && !INT_RE.test(r.yearsOfExperience.trim())) {
      sheets.skills.push({ row, column: "yearsOfExperience", severity: "error", message: `"${r.yearsOfExperience.trim()}" is not a whole number for yearsOfExperience` });
    }
    if (r.lastUsedYear?.trim() && !YEAR_RE.test(r.lastUsedYear.trim())) {
      sheets.skills.push({ row, column: "lastUsedYear", severity: "error", message: `"${r.lastUsedYear.trim()}" is not a valid 4-digit year` });
    }
  }

  checkEmployeeRef("certifications", certifications);
  for (let i = 0; i < certifications.length; i++) {
    const r = certifications[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    if (!r.name?.trim() || !r.issuingOrganization?.trim()) {
      sheets.certifications.push({ row, severity: "error", message: "name and issuingOrganization are required" });
      continue;
    }
    if (r.issueDate?.trim() && !DATE_RE.test(r.issueDate.trim())) {
      sheets.certifications.push(dateIssue(row, "issueDate", r.issueDate.trim()));
    }
    if (r.expiryDate?.trim() && !DATE_RE.test(r.expiryDate.trim())) {
      sheets.certifications.push(dateIssue(row, "expiryDate", r.expiryDate.trim()));
    }
  }

  checkEmployeeRef("familyMembers", familyMembers);
  for (let i = 0; i < familyMembers.length; i++) {
    const r = familyMembers[i];
    const row = i + 1;
    if (!r.employeeId?.trim()) continue;
    if (!r.name?.trim() || !r.relation?.trim()) {
      sheets.familyMembers.push({ row, severity: "error", message: "name and relation are required" });
      continue;
    }
    if (r.dateOfBirth?.trim() && !DATE_RE.test(r.dateOfBirth.trim())) {
      sheets.familyMembers.push(dateIssue(row, "dateOfBirth", r.dateOfBirth.trim()));
    }
    if (r.gender?.trim() && !GENDER_VALUES.includes(r.gender.trim())) {
      sheets.familyMembers.push({ row, column: "gender", severity: "warning", message: `"${r.gender.trim()}" is not one of Male, Female, Other` });
    }
  }

  let errorCount = 0;
  let warningCount = 0;
  for (const list of Object.values(sheets)) {
    for (const issue of list) {
      if (issue.severity === "error") errorCount++;
      else warningCount++;
    }
  }

  return { sheets, errorCount, warningCount };
}
