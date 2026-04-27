import { useState, useEffect, useMemo, useRef } from "react";
import {
  SurveyRow,
  SurveyDoc,
  SurveyQuestionRow,
  Analytics,
  ToastMessage,
} from "../types";
import { normalizeSurveyDoc, validateSurvey, uid } from "../utils";

export const NEW_SURVEY_KEY = "__new__";

interface UseSurveysOptions {
  addToast: (message: string, type: ToastMessage["type"]) => void;
}

export function useSurveys({ addToast }: UseSurveysOptions) {
  const frappe = (globalThis as any).frappe;

  // -- List state ----------------------------------------------------------
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // -- Selected doc state ---------------------------------------------------
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [doc, setDoc] = useState<SurveyDoc | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // -- Analytics state ------------------------------------------------------
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // -- Link copy state ------------------------------------------------------
  const [linkCopied, setLinkCopied] = useState(false);

  // -- Derived --------------------------------------------------------------
  const selectedRow = useMemo(
    () => surveys.find((s) => s.name === selectedName) ?? null,
    [surveys, selectedName]
  );

  // Use a ref so callbacks always close over latest surveys without stale state
  const surveysRef = useRef(surveys);
  surveysRef.current = surveys;

  // -- Data fetching --------------------------------------------------------

  const loadList = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const r = await frappe.call({
        method: "corporate_services.api.survey.get_surveys",
      });
      const data = (r?.message ?? []) as SurveyRow[];
      setSurveys(data);
      // Auto-select first item only if nothing is selected
      setSelectedName((prev) => {
        if (prev) return prev;
        return data[0]?.name ?? null;
      });
    } catch (e: any) {
      setListError(e?.message || "Failed to load surveys.");
    } finally {
      setListLoading(false);
    }
  };

  const loadDoc = async (name: string) => {
    setDocLoading(true);
    setDocError(null);
    setDirty(false);
    setAnalytics(null);
    try {
      const r = await frappe.call({
        method: "corporate_services.api.survey.get_survey_detail",
        args: { survey: name },
      });
      setDoc(normalizeSurveyDoc(r?.message));
    } catch (e: any) {
      setDoc(null);
      setDocError(e?.message || "Failed to load survey.");
    } finally {
      setDocLoading(false);
    }
  };

  // Initial list load
  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load doc whenever selection changes (skip NEW sentinel)
  useEffect(() => {
    if (selectedName && selectedName !== NEW_SURVEY_KEY) {
      loadDoc(selectedName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedName]);

  // -- Mutations ------------------------------------------------------------

  const updateDoc = (updater: (d: SurveyDoc) => SurveyDoc) => {
    setDoc((prev) => (prev ? updater(prev) : prev));
    setDirty(true);
  };

  const createNew = () => {
    const blank: SurveyDoc = {
      doctype: "Survey",
      __islocal: 1,
      title: "",
      description: "",
      year: new Date().getFullYear(),
      is_published: 0,
      departments: "",
      total_submissions: 0,
      sections: [],
    };
    setDoc(blank);
    setDirty(false);
    setIsNew(true);
    setAnalytics(null);
    setSelectedName(NEW_SURVEY_KEY);
  };

  const cancelNew = () => {
    if (dirty && !globalThis.confirm("Discard unsaved changes?")) return;
    setIsNew(false);
    setDoc(null);
    setDirty(false);
    const current = surveysRef.current;
    setSelectedName(current[0]?.name ?? null);
  };

  const save = async () => {
    if (!doc) return;
    const errs = validateSurvey(doc);
    if (errs.length) {
      frappe.msgprint({
        title: "Please fix these issues",
        message: `<ul>${errs
          .map((e) => `<li>${frappe.utils.escape_html(e)}</li>`)
          .join("")}</ul>`,
        indicator: "red",
      });
      return;
    }
    setDocLoading(true);
    setDocError(null);
    try {
      const r = await frappe.call({
        method: "corporate_services.api.survey.save_survey",
        args: { doc },
      });
      const saved = normalizeSurveyDoc(r?.message);
      setDoc(saved);
      setDirty(false);
      setIsNew(false);
      setSelectedName(saved.name ?? null);
      await loadList();
      addToast("Survey saved successfully.", "success");
    } catch (e: any) {
      const msg = e?.message || "Save failed.";
      setDocError(msg);
      addToast(msg, "error");
    } finally {
      setDocLoading(false);
    }
  };

  const togglePublish = async () => {
    if (!selectedRow?.name) return;
    const next: 0 | 1 = selectedRow.is_published ? 0 : 1;
    try {
      await frappe.call({
        method: "corporate_services.api.survey.set_survey_published",
        args: { survey: selectedRow.name, is_published: next },
      });
      setDoc((prev) => (prev ? { ...prev, is_published: next } : prev));
      await loadList();
      addToast(next ? "Survey published." : "Survey unpublished.", "success");
    } catch (e: any) {
      addToast(e?.message || "Failed to update publish status.", "error");
    }
  };

  const loadAnalytics = async (department?: string) => {
    if (!selectedRow?.name) return;
    setAnalyticsLoading(true);
    try {
      const r = await frappe.call({
        method: "corporate_services.api.survey.get_survey_analytics",
        args: { survey: selectedRow.name, department: department || null },
      });
      setAnalytics(r?.message ?? null);
    } catch (e: any) {
      addToast(e?.message || "Failed to load report.", "error");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // -- Section / Question helpers -------------------------------------------

  const addSection = () => {
    updateDoc((d) => {
      const nextOrder =
        (d.sections.reduce((m, s) => Math.max(m, s.order || 0), 0) || 0) + 1;
      return {
        ...d,
        sections: [
          ...d.sections,
          {
            doctype: "Survey Section" as const,
            __islocal: 1 as const,
            __unsaved: 1 as const,
            __temporary_name: uid(),
            title: "New Section",
            order: nextOrder,
            questions: [],
          },
        ],
      };
    });
  };

  const removeSection = (idx: number) => {
    updateDoc((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== idx) }));
  };

  const addQuestion = (sectionIdx: number) => {
    updateDoc((d) => ({
      ...d,
      sections: d.sections.map((s, i) => {
        if (i !== sectionIdx) return s;
        const nextOrder =
          (s.questions.reduce((m, q) => Math.max(m, q.order || 0), 0) || 0) + 1;
        return {
          ...s,
          questions: [
            ...s.questions,
            {
              doctype: "Survey Question" as const,
              __islocal: 1 as const,
              __unsaved: 1 as const,
              __temporary_name: uid(),
              question_text: "",
              question_type: "TEXT" as const,
              options: "",
              follow_up_text: "",
              is_required: 0 as const,
              order: nextOrder,
            },
          ],
        };
      }),
    }));
  };

  const removeQuestion = (sectionIdx: number, qIdx: number) => {
    updateDoc((d) => ({
      ...d,
      sections: d.sections.map((s, i) => {
        if (i !== sectionIdx) return s;
        return { ...s, questions: s.questions.filter((_, qi) => qi !== qIdx) };
      }),
    }));
  };

  // -- Public URL -----------------------------------------------------------

  const publicUrl = useMemo(() => {
    if (!selectedRow?.name) return "";
    const base = (globalThis as any).location?.origin ?? "";
    return `${base}/survey-public?survey=${encodeURIComponent(selectedRow.name)}`;
  }, [selectedRow]);

  const copyPublicLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // -- Select survey --------------------------------------------------------

  const selectSurvey = (name: string) => {
    if (name === selectedName) return;
    if (dirty && !globalThis.confirm("Discard unsaved changes?")) return;
    setIsNew(false);
    setSelectedName(name);
    setAnalytics(null);
  };

  return {
    // state
    surveys,
    listLoading,
    listError,
    selectedName,
    selectedRow,
    doc,
    docLoading,
    docError,
    dirty,
    isNew,
    analytics,
    analyticsLoading,
    publicUrl,
    linkCopied,
    // actions
    loadList,
    selectSurvey,
    createNew,
    cancelNew,
    updateDoc,
    save,
    togglePublish,
    loadAnalytics,
    addSection,
    removeSection,
    addQuestion,
    removeQuestion,
    copyPublicLink,
  };
}
