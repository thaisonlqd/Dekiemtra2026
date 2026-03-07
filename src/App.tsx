import React, { useState, useRef, useEffect } from 'react';
import { AppStep, InputData, GenerationState, Lesson, Chapter, QuestionConfig, LevelConfig } from './types';
import StepIndicator from './components/StepIndicator';
import Button from './components/Button';
import MarkdownView from './components/MarkdownView';
import { generateStep1Matrix, generateStep2Specs, generateStep3Exam, extractInfoFromDocument, convertMatrixFileToHtml, getApiKey, setApiKey as saveApiKey } from './services/geminiService';
import { ArrowRight, RotateCcw, FileText, Download, AlertCircle, Upload, Clock, Check, ChevronDown, ChevronRight, Filter, FileUp, Settings, Key, ExternalLink, FileSignature, ShieldCheck } from 'lucide-react';
import { ThemeContext } from './ThemeContext';

import { EDUCATION_LEVELS, GRADES, SUBJECTS, MODELS, DEFAULT_MODEL } from './constants';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.INPUT);
  const [completedSteps, setCompletedSteps] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<'khdh' | 'matrix_specs'>('khdh');
  const [theme, setTheme] = useState<'modern' | 'classic'>('modern');

  const themeClasses = {
    container: theme === 'classic' ? 'font-serif bg-white text-black' : 'font-sans bg-white text-black',
    card: theme === 'classic' ? 'bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8' : 'bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8',
    button: theme === 'classic' ? 'rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none' : 'rounded-lg shadow-sm hover:shadow-md transition-all',
    input: theme === 'classic' ? 'rounded-none border-2 border-black focus:ring-0 focus:border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'rounded-lg border-slate-300 focus:ring-2 focus:ring-primary outline-none',
    header: theme === 'classic' ? 'bg-white border-b-2 border-black' : 'bg-white border-b border-slate-200 shadow-sm',
    tabActive: theme === 'classic' ? 'bg-sky-100 text-black rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] font-bold' : 'bg-sky-100 text-black border border-sky-300 rounded-lg shadow-sm font-bold',
    tabInactive: theme === 'classic' ? 'bg-white text-black border-2 border-black rounded-none hover:bg-gray-100 font-bold' : 'text-black hover:bg-sky-50 rounded-lg font-bold',
    stepIndicator: theme === 'classic' ? 'border-b-2 border-black' : 'border-b border-slate-200',
    badge: theme === 'classic' ? 'bg-sky-100 text-black rounded-none border border-black' : 'bg-sky-100 text-black border border-sky-300 rounded-full',
  };

  // -- Data State --
  const [inputData, setInputData] = useState<InputData>({
    educationLevel: 'THCS', // Default
    subject: 'Toán',
    grade: 'Lớp 6',
    duration: 45,
    examType: 'Giữa kỳ 1',
    model: DEFAULT_MODEL,
    topics: '',
    additionalNotes: '',
    chapters: [],
    ratioMode: 'auto',
    knowledgeRatio: '4-3-3',
    percentages: { biet: 40, hieu: 30, van_dung: 30 },
    hasSpecialNeedsStudents: false,
    enabledTypes: {
      type1: true,
      type2: true,
      type3: true,
      essay: true,
    },
    questionConfig: {
      type1: { biet: 8, hieu: 4, van_dung: 0 },
      type2: { 
        count: 4, 
        counts: { biet: 6, hieu: 6, van_dung: 4 }, // 4 * 4 = 16 items
      },
      type3: { biet: 1, hieu: 1, van_dung: 2 },
      essay: { biet: 0, hieu: 1, van_dung: 2 },
    }
  });

  // -- UI State --
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(new Set());

  const [genState, setGenState] = useState<GenerationState>({
    matrix: '',
    specs: '',
    exam: '',
    isLoading: false,
    error: null
  });

  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const matrixUploadRef = useRef<HTMLInputElement>(null); // Ref for Step 2 upload
  const matrixDirectUploadRef = useRef<HTMLInputElement>(null); // Ref for Step 1 direct upload

  // -- API Key State --
  const [apiKey, setApiKeyState] = useState<string>(getApiKey() || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(!getApiKey());
  const [tempApiKey, setTempApiKey] = useState<string>('');

  // --- API Key Handlers ---
  const handleSaveApiKey = () => {
    const key = tempApiKey.trim();
    if (!key) return;
    saveApiKey(key);
    setApiKeyState(key);
    setShowApiKeyModal(false);
    setTempApiKey('');
  };

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'educationLevel') {
      // Reset Subject and Grade when Level changes
      const defaultSubject = SUBJECTS[value]?.[0] || '';
      const defaultGrade = GRADES[value]?.[0] || '';
      setInputData(prev => ({ 
        ...prev, 
        educationLevel: value, 
        subject: defaultSubject, 
        grade: defaultGrade 
      }));
    } else if (name === 'examType') {
      let newDuration = 45;
      if (value.includes('15 phút')) newDuration = 15;
      else if (value.includes('45 phút')) newDuration = 45;
      else if (value.includes('Giữa') || value.includes('Cuối')) newDuration = 90; // Standard for semesters

      setInputData(prev => ({ ...prev, [name]: value, duration: newDuration }));

      // Auto-filter topics when exam type changes
      if (inputData.chapters.length > 0) {
        applySmartFilter(value, inputData.chapters);
      }

    } else {
      setInputData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingFile(true);
    setUploadedFileName(file.name);
    setGenState(prev => ({ ...prev, error: null }));

    try {
      const extracted = await extractInfoFromDocument(file);

      setInputData(prev => ({
        ...prev,
        subject: extracted.subject || prev.subject,
        grade: extracted.grade || prev.grade,
        topics: extracted.topics || prev.topics, // Fallback
        chapters: extracted.chapters || [],
      }));

      // Initialize selection: Expand all chapters, Apply filter
      if (extracted.chapters && extracted.chapters.length > 0) {
        const allChapIds = new Set(extracted.chapters.map(c => c.id));
        setExpandedChapterIds(allChapIds);
        applySmartFilter(inputData.examType, extracted.chapters);
      }

    } catch (err: any) {
      setGenState(prev => ({ ...prev, error: `Lỗi đọc file: ${err.message}` }));
      setUploadedFileName(null);
    } finally {
      setIsAnalyzingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Common logic for processing uploaded matrix file
  const processMatrixUpload = async (file: File) => {
    setGenState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let content = "";

      // If HTML or Text, read directly
      if (file.type === "text/html" || file.type === "text/plain" || file.name.endsWith(".html") || file.name.endsWith(".txt")) {
        content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsText(file);
        });
      }
      // If PDF or Doc/Docx, convert using AI
      else {
        content = await convertMatrixFileToHtml(file);
      }

      setGenState(prev => ({ ...prev, matrix: content, isLoading: false }));
      return true;
    } catch (err: any) {
      setGenState(prev => ({ ...prev, isLoading: false, error: err.message }));
      return false;
    }
  };

  const handleMatrixUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await processMatrixUpload(file);
    if (matrixUploadRef.current) matrixUploadRef.current.value = '';
  };

  const handleMatrixSkipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const success = await processMatrixUpload(file);
    if (success) {
      // Skip to Matrix Step (Step 2) immediately
      setCurrentStep(AppStep.MATRIX);
      setCompletedSteps(Math.max(completedSteps, 1));
    }

    if (matrixDirectUploadRef.current) matrixDirectUploadRef.current.value = '';
  };

  // -- Topic Selection Logic --

  const applySmartFilter = (type: string, chapters: Chapter[]) => {
    const newSelection = new Set<string>();

    chapters.forEach(chap => {
      chap.lessons.forEach(lesson => {
        const end = lesson.weekEnd || 99; // Default to late if unknown
        const start = lesson.weekStart || 0;
        let shouldSelect = false;

        if (type.includes('Giữa kỳ 1')) shouldSelect = end <= 10;
        else if (type.includes('Cuối kỳ 1')) shouldSelect = end <= 18;
        else if (type.includes('Giữa kỳ 2')) shouldSelect = start >= 19 && end <= 27;
        else if (type.includes('Cuối kỳ 2')) shouldSelect = true; // All
        else shouldSelect = true; // 15 mins etc (User manual select)

        if (shouldSelect) newSelection.add(lesson.id);
      });
    });
    setSelectedLessonIds(newSelection);
  };

  const toggleChapter = (chapId: string, select: boolean) => {
    const chapter = inputData.chapters.find(c => c.id === chapId);
    if (!chapter) return;

    const newSet = new Set(selectedLessonIds);
    chapter.lessons.forEach(l => {
      if (select) newSet.add(l.id);
      else newSet.delete(l.id);
    });
    setSelectedLessonIds(newSet);
  };

  const toggleLesson = (lessonId: string) => {
    const newSet = new Set(selectedLessonIds);
    if (newSet.has(lessonId)) newSet.delete(lessonId);
    else newSet.add(lessonId);
    setSelectedLessonIds(newSet);
  };

  const toggleExpandChapter = (chapId: string) => {
    const newSet = new Set(expandedChapterIds);
    if (newSet.has(chapId)) newSet.delete(chapId);
    else newSet.add(chapId);
    setExpandedChapterIds(newSet);
  };

  // -- Question Config Logic --
  const updateQuestionConfig = (type: keyof QuestionConfig, level: 'biet' | 'hieu' | 'van_dung', value: number) => {
    if (type === 'type2') return; // Type 2 is handled separately

    setInputData(prev => ({
      ...prev,
      ratioMode: 'manual',
      questionConfig: {
        ...prev.questionConfig,
        [type]: {
          ...(prev.questionConfig[type] as LevelConfig),
          [level]: Math.max(0, value)
        }
      }
    }));
  };

  const applyRatio = (ratioStr: string) => {
    const parts = ratioStr.split('-').map(s => parseFloat(s.trim()));
    if (parts.length !== 3 || parts.some(isNaN)) return;

    const [rB, rH, rV] = parts; // e.g. 4, 3, 3
    const totalRatio = rB + rH + rV; // usually 10

    // Helper to distribute count based on ratio
    const distribute = (total: number) => {
      if (total === 0) return { b: 0, h: 0, v: 0 };
      const b = Math.round((total * rB) / totalRatio);
      const h = Math.round((total * rH) / totalRatio);
      const v = total - b - h; // Remainder to Vận dụng
      if (v < 0) return { b: b + v, h, v: 0 }; 
      return { b, h, v };
    };

    setInputData(prev => {
      const { enabledTypes } = prev;
      // Calculate current totals to maintain them, but only for enabled types
      const t1Total = enabledTypes.type1 ? (prev.questionConfig.type1.biet + prev.questionConfig.type1.hieu + prev.questionConfig.type1.van_dung) : 0;
      const t2TotalItems = enabledTypes.type2 ? (prev.questionConfig.type2.count * 4) : 0;
      const t3Total = enabledTypes.type3 ? (prev.questionConfig.type3.biet + prev.questionConfig.type3.hieu + prev.questionConfig.type3.van_dung) : 0;
      const essayTotal = enabledTypes.essay ? (prev.questionConfig.essay.biet + prev.questionConfig.essay.hieu + prev.questionConfig.essay.van_dung) : 0;

      const d1 = distribute(t1Total || (enabledTypes.type1 ? 12 : 0)); 
      const d2 = distribute(t2TotalItems || (enabledTypes.type2 ? 16 : 0));
      const d3 = distribute(t3Total || (enabledTypes.type3 ? 6 : 0));
      const dEssay = distribute(essayTotal || (enabledTypes.essay ? 1 : 0));

      return {
        ...prev,
        knowledgeRatio: ratioStr,
        questionConfig: {
          ...prev.questionConfig,
          type1: enabledTypes.type1 ? { biet: d1.b, hieu: d1.h, van_dung: d1.v } : { biet: 0, hieu: 0, van_dung: 0 },
          type2: { 
            ...prev.questionConfig.type2,
            counts: enabledTypes.type2 ? { biet: d2.b, hieu: d2.h, van_dung: d2.v } : { biet: 0, hieu: 0, van_dung: 0 }
          },
          type3: enabledTypes.type3 ? { biet: d3.b, hieu: d3.h, van_dung: d3.v } : { biet: 0, hieu: 0, van_dung: 0 },
          essay: enabledTypes.essay ? { biet: dEssay.b, hieu: dEssay.h, van_dung: dEssay.v } : { biet: 0, hieu: 0, van_dung: 0 },
        }
      };
    });
  };

  const handleRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRatio = e.target.value;
    setInputData(prev => ({ ...prev, knowledgeRatio: newRatio }));
  };

  const handleRatioBlur = () => {
    applyRatio(inputData.knowledgeRatio);
  };

  const handlePercentageChange = (level: keyof InputData['percentages'], value: number) => {
    setInputData(prev => {
      const newPercentages = { ...prev.percentages, [level]: value };
      return { ...prev, percentages: newPercentages };
    });
  };

  const applyPercentages = () => {
    const { biet, hieu, van_dung } = inputData.percentages;
    const total = biet + hieu + van_dung;
    if (total !== 100) {
      alert("Tổng phần trăm phải bằng 100%. Hiện tại: " + total + "%");
      return;
    }

    const ratioStr = `${biet / 10}-${hieu / 10}-${van_dung / 10}`;
    applyRatio(ratioStr);
  };

  const calculateCurrentRatio = () => {
    const { type1, type2, type3, essay } = inputData.questionConfig;
    const { enabledTypes } = inputData;
    
    let b = 0, h = 0, v = 0;
    
    if (enabledTypes.type1) {
      b += type1.biet; h += type1.hieu; v += type1.van_dung;
    }
    if (enabledTypes.type2) {
      b += type2.counts.biet; h += type2.counts.hieu; v += type2.counts.van_dung;
    }
    if (enabledTypes.type3) {
      b += type3.biet; h += type3.hieu; v += type3.van_dung;
    }
    if (enabledTypes.essay) {
      b += essay.biet; h += essay.hieu; v += essay.van_dung;
    }

    const total = b + h + v;
    if (total === 0) return "0-0-0";
    
    const rB = ((b / total) * 10).toFixed(1);
    const rH = ((h / total) * 10).toFixed(1);
    const rV = ((v / total) * 10).toFixed(1);
    return `${rB}-${rH}-${rV}`;
  };

  // -- Effects --
  useEffect(() => {
    if (inputData.hasSpecialNeedsStudents) {
      const newPercentages = { biet: 60, hieu: 35, van_dung: 5 };
      setInputData(prev => ({
        ...prev,
        percentages: newPercentages
      }));
      // Auto apply
      applyRatio("6-3.5-0.5");
    } else {
      const newPercentages = { biet: 40, hieu: 30, van_dung: 30 };
      setInputData(prev => ({
        ...prev,
        percentages: newPercentages
      }));
      // Auto apply
      applyRatio("4-3-3");
    }
  }, [inputData.hasSpecialNeedsStudents]);

  // -- Generation Handlers --

  const handleGenerateMatrix = async () => {
    if (selectedLessonIds.size === 0) {
      alert("Vui lòng chọn ít nhất 1 bài học/chủ đề!");
      return;
    }

    setGenState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const matrix = await generateStep1Matrix(inputData, selectedLessonIds);
      setGenState(prev => ({ ...prev, matrix, isLoading: false }));
      setCurrentStep(AppStep.MATRIX);
      setCompletedSteps(Math.max(completedSteps, 1));
    } catch (err: any) {
      setGenState(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  };

  const handleGenerateSpecs = async () => {
    setGenState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const specs = await generateStep2Specs(genState.matrix, inputData, selectedLessonIds);
      setGenState(prev => ({ ...prev, specs, isLoading: false }));
      setCurrentStep(AppStep.SPECS);
      setCompletedSteps(Math.max(completedSteps, 2));
    } catch (err: any) {
      setGenState(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  };

  const handleGenerateExam = async () => {
    setGenState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const exam = await generateStep3Exam(genState.specs, inputData);
      setGenState(prev => ({ ...prev, exam, isLoading: false }));
      setCurrentStep(AppStep.EXAM);
      setCompletedSteps(Math.max(completedSteps, 3));
    } catch (err: any) {
      setGenState(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  };

  const handleDownloadWord = (content: string, fileName: string) => {
    // Create a basic HTML wrapper for Word compatibility
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${fileName}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
          td, th { border: 1px solid black; padding: 5px; vertical-align: middle; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .question-number { font-weight: bold; }
          p { margin-top: 0.5em; margin-bottom: 0.5em; }
        </style>
      </head><body>`;
    const footer = "</body></html>";

    // If content is already a full HTML doc, use it directly, otherwise wrap it
    const sourceHTML = content.includes('<!DOCTYPE html>') ? content : (header + content + footer);

    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Using .doc extension because Word accepts HTML content in .doc format
    // but rejects it in .docx (which expects OOXML ZIP format).
    link.download = `${fileName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Sub-Components for Render ---

  const renderQuestionConfigRow = (
    label: string,
    typeKey: keyof QuestionConfig,
    defaultB: number,
    defaultH: number,
    defaultV: number
  ) => {
    if (typeKey === 'type2') return null; // Should use renderType2ConfigRow instead
    
    const config = inputData.questionConfig[typeKey] as LevelConfig;

    return (
      <div className="grid grid-cols-4 gap-4 items-center py-2 border-b border-slate-100 last:border-0">
        <span className="text-sm font-semibold text-black">{label}</span>
        <div className="flex flex-col">
          <span className="text-xs text-black mb-1">Biết</span>
          <input
            type="number"
            className="w-full p-2 border rounded bg-white text-center text-sm"
            value={config.biet}
            onChange={(e) => updateQuestionConfig(typeKey, 'biet', parseInt(e.target.value))}
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-black mb-1">Hiểu</span>
          <input
            type="number"
            className="w-full p-2 border rounded bg-white text-center text-sm"
            value={config.hieu}
            onChange={(e) => updateQuestionConfig(typeKey, 'hieu', parseInt(e.target.value))}
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-black mb-1">Vận dụng</span>
          <input
            type="number"
            className="w-full p-2 border rounded bg-white text-center text-sm"
            value={config.van_dung}
            onChange={(e) => updateQuestionConfig(typeKey, 'van_dung', parseInt(e.target.value))}
          />
        </div>
      </div>
    );
  };

  const renderType2ConfigRow = () => {
    const { count, counts } = inputData.questionConfig.type2;
    const totalItems = count * 4;
    const currentTotal = counts.biet + counts.hieu + counts.van_dung;
    const isValid = currentTotal === totalItems;

    const updateType2Count = (newCount: number) => {
      // When question count changes, redistribute items based on ratio
      const newTotalItems = newCount * 4;
      // Parse current ratio
      const parts = inputData.knowledgeRatio.split('-').map(s => parseInt(s.trim()));
      let rB = 4, rH = 3, rV = 3;
      if (parts.length === 3 && !parts.some(isNaN)) {
        [rB, rH, rV] = parts;
      }
      const totalRatio = rB + rH + rV;
      
      const b = Math.round((newTotalItems * rB) / totalRatio);
      const h = Math.round((newTotalItems * rH) / totalRatio);
      const v = newTotalItems - b - h;

      setInputData(prev => ({
        ...prev,
        questionConfig: {
          ...prev.questionConfig,
          type2: {
            ...prev.questionConfig.type2,
            count: newCount,
            counts: { biet: b, hieu: h, van_dung: v }
          }
        }
      }));
    };

    const updateType2Level = (level: 'biet' | 'hieu' | 'van_dung', val: number) => {
      setInputData(prev => ({
        ...prev,
        ratioMode: 'manual',
        questionConfig: {
          ...prev.questionConfig,
          type2: {
            ...prev.questionConfig.type2,
            counts: {
              ...prev.questionConfig.type2.counts,
              [level]: Math.max(0, val)
            }
          }
        }
      }));
    };

    return (
      <div className="grid grid-cols-4 gap-4 items-start py-4 border-b border-slate-100 last:border-0">
        <div className="pt-2">
          <span className="text-sm font-semibold text-black block">Dạng II (Đúng/Sai)</span>
        </div>
        <div className="col-span-3 space-y-4">
          {/* Question Count */}
          <div className="flex flex-col">
            <span className="text-xs text-black mb-1">Số lượng câu hỏi (Mỗi câu 4 ý)</span>
            <div className="flex items-center gap-4">
              <input
                type="number"
                className="w-24 p-2 border rounded bg-white text-center text-sm"
                value={count}
                onChange={(e) => updateType2Count(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-sm font-medium text-black">
                = <span className="text-primary font-bold">{totalItems}</span> ý nhỏ
              </span>
            </div>
          </div>

          {/* Level Distribution */}
          <div className="bg-white p-3 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-black">Phân bổ số ý (Tổng phải bằng {totalItems})</span>
              {!isValid && <span className="text-xs text-red-500 font-bold">Hiện tại: {currentTotal} (Chênh lệch: {currentTotal - totalItems})</span>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-black mb-1">Biết</span>
                <input
                  type="number"
                  className={`w-full p-2 border rounded text-center text-sm ${!isValid ? 'border-red-300 bg-red-50' : 'bg-white'}`}
                  value={counts.biet}
                  onChange={(e) => updateType2Level('biet', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-black mb-1">Hiểu</span>
                <input
                  type="number"
                  className={`w-full p-2 border rounded text-center text-sm ${!isValid ? 'border-red-300 bg-red-50' : 'bg-white'}`}
                  value={counts.hieu}
                  onChange={(e) => updateType2Level('hieu', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-black mb-1">Vận dụng</span>
                <input
                  type="number"
                  className={`w-full p-2 border rounded text-center text-sm ${!isValid ? 'border-red-300 bg-red-50' : 'bg-white'}`}
                  value={counts.van_dung}
                  onChange={(e) => updateType2Level('van_dung', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          
          {/* Suggestions */}
          <div className="grid grid-cols-1">
          </div>
        </div>
      </div>
    );
  };

  const renderInputStep = () => (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className={`p-1 inline-flex ${theme === 'classic' ? 'bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white rounded-xl shadow-sm border border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('khdh')}
            className={`px-6 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'khdh' 
                ? themeClasses.tabActive
                : themeClasses.tabInactive
            }`}
          >
            Khởi tạo đề từ KHDH
          </button>
          <button
            onClick={() => setActiveTab('matrix_specs')}
            className={`px-6 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'matrix_specs' 
                ? themeClasses.tabActive
                : themeClasses.tabInactive
            }`}
          >
            Khởi tạo đề từ Ma trận - Đặc tả
          </button>
        </div>
      </div>

      {activeTab === 'khdh' ? (
        <>
          {/* 1. Basic Info & Upload */}
          <div className={themeClasses.card}>
            <h2 className="text-xl font-bold mb-6 flex items-center justify-center gap-2 uppercase">
              <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold ${themeClasses.badge}`}>1</span>
              CẤU HÌNH CƠ BẢN CHO ĐỀ KIỂM TRA
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Cấp học</label>
                <select name="educationLevel" value={inputData.educationLevel} onChange={handleInputChange} className={`w-full p-3 bg-white ${themeClasses.input}`}>
                  {EDUCATION_LEVELS.map(level => (
                    <option key={level.id} value={level.id}>{level.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Lớp học</label>
                <select name="grade" value={inputData.grade} onChange={handleInputChange} className={`w-full p-3 bg-white ${themeClasses.input}`}>
                  {GRADES[inputData.educationLevel]?.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Môn học</label>
                <select name="subject" value={inputData.subject} onChange={handleInputChange} className={`w-full p-3 bg-white ${themeClasses.input}`}>
                  {SUBJECTS[inputData.educationLevel]?.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Loại kiểm tra (Auto Filter)</label>
                <select name="examType" value={inputData.examType} onChange={handleInputChange} className={`w-full p-3 bg-white ${themeClasses.input}`}>
                  <option>Kiểm tra 15 phút</option>
                  <option>Kiểm tra 45 phút</option>
                  <option>Giữa kỳ 1</option>
                  <option>Cuối kỳ 1</option>
                  <option>Giữa kỳ 2</option>
                  <option>Cuối kỳ 2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Thời gian (phút)</label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <input type="number" name="duration" value={inputData.duration} onChange={handleInputChange} className={`w-full p-3 pl-10 bg-white ${themeClasses.input}`} />
                    <Clock className="w-5 h-5 text-black absolute left-3 top-3.5" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={inputData.hasSpecialNeedsStudents}
                      onChange={(e) => setInputData(prev => ({ ...prev, hasSpecialNeedsStudents: e.target.checked }))}
                      className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="text-sm font-bold text-black group-hover:text-red-600 transition-colors">Lớp có HS khuyết tật</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-teal-200 rounded-lg bg-white text-center relative">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx" className="hidden" id="file-upload" disabled={isAnalyzingFile} />
              <label htmlFor="file-upload" className={`cursor-pointer flex flex-col items-center justify-center ${isAnalyzingFile ? 'opacity-50' : ''}`}>
                {isAnalyzingFile ? (
                  <div className="flex items-center gap-2 text-primary font-medium"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> Đang phân tích...</div>
                ) : uploadedFileName ? (
                  <div className="flex items-center gap-2 text-green-700 font-medium"><Check className="w-5 h-5" /> {uploadedFileName} (Click thay đổi)</div>
                ) : (
                  <div className="flex items-center gap-2 text-primary font-medium"><Upload className="w-5 h-5" /> Upload File KHDH (.pdf, .docx)</div>
                )}
              </label>
            </div>
          </div>

          {/* 2. Topic Selection Tree */}
          {inputData.chapters.length > 0 && (
            <div className={themeClasses.card}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold ${themeClasses.badge}`}>2</span>
                  Chọn chủ đề trọng tâm
                </h2>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => applySmartFilter(inputData.examType, inputData.chapters)} className="flex items-center gap-1 text-black bg-sky-100 border border-sky-300 hover:bg-sky-200 px-2 py-1 rounded font-medium"><Filter className="w-3 h-3" /> Lọc theo kỳ</button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden border-slate-200">
                {inputData.chapters.map(chap => {
                  const isExpanded = expandedChapterIds.has(chap.id);
                  const activeLessonCount = chap.lessons.filter(l => selectedLessonIds.has(l.id)).length;
                  const isFullSelected = activeLessonCount === chap.lessons.length;
                  const isPartSelected = activeLessonCount > 0 && !isFullSelected;

                  return (
                    <div key={chap.id} className="border-b border-slate-100 last:border-0">
                      {/* Chapter Header */}
                      <div className="flex items-center bg-white p-3 hover:bg-slate-50 transition-colors">
                        <button onClick={() => toggleExpandChapter(chap.id)} className="p-1 mr-2 text-black">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <input
                          type="checkbox"
                          className="w-4 h-4 mr-3 text-primary rounded focus:ring-primary"
                          checked={isFullSelected}
                          ref={el => { if (el) el.indeterminate = isPartSelected; }}
                          onChange={(e) => toggleChapter(chap.id, e.target.checked)}
                        />
                        <div className="flex-1 font-semibold text-sm text-black">
                          {chap.name}
                        </div>
                        <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded text-black ml-2">
                          {chap.totalPeriods} tiết
                        </span>
                      </div>

                      {/* Lessons List */}
                      {isExpanded && (
                        <div className="pl-12 pr-4 py-2 space-y-1 bg-white">
                          {chap.lessons.map(lesson => (
                            <div key={lesson.id} className="flex items-center p-2 hover:bg-teal-50 rounded group">
                              <input
                                type="checkbox"
                                className="w-4 h-4 mr-3 text-primary rounded focus:ring-primary"
                                checked={selectedLessonIds.has(lesson.id)}
                                onChange={() => toggleLesson(lesson.id)}
                              />
                              <div className="flex-1 text-sm text-black">
                                {lesson.name}
                              </div>
                              <div className="flex gap-2 opacity-70 group-hover:opacity-100">
                                <span className="text-[10px] bg-white border border-green-200 text-green-700 px-1.5 py-0.5 rounded">{lesson.periods} tiết</span>
                                {lesson.weekEnd && <span className="text-[10px] bg-white border border-blue-200 text-black px-1.5 py-0.5 rounded">Tuần {lesson.weekStart}-{lesson.weekEnd}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-between items-center text-sm text-black bg-white p-3 rounded border border-teal-100">
                <span>Đã chọn: <strong className="text-primary">{selectedLessonIds.size}</strong> bài học</span>
              </div>
            </div>
          )}

          {/* 3. Question Configuration */}
          <div className={themeClasses.card}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold ${themeClasses.badge}`}>3</span>
              Cấu trúc đề thi
            </h2>

            {/* Question Type Selection */}
            <div className="mb-6 bg-white p-4 rounded-lg border border-slate-200">
              <label className="block text-sm font-bold text-black mb-3">Cấu trúc các dạng câu hỏi</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={inputData.enabledTypes.type1}
                    onChange={(e) => setInputData(prev => ({ ...prev, enabledTypes: { ...prev.enabledTypes, type1: e.target.checked } }))}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-black group-hover:text-red-600 transition-colors">Trắc nghiệm</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={inputData.enabledTypes.type2}
                    onChange={(e) => setInputData(prev => ({ ...prev, enabledTypes: { ...prev.enabledTypes, type2: e.target.checked } }))}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-black group-hover:text-red-600 transition-colors">Đúng - Sai</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={inputData.enabledTypes.type3}
                    onChange={(e) => setInputData(prev => ({ ...prev, enabledTypes: { ...prev.enabledTypes, type3: e.target.checked } }))}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-black group-hover:text-red-600 transition-colors">Trả lời ngắn</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={inputData.enabledTypes.essay}
                    onChange={(e) => setInputData(prev => ({ ...prev, enabledTypes: { ...prev.enabledTypes, essay: e.target.checked } }))}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-black group-hover:text-red-600 transition-colors">Tự luận</span>
                </label>
              </div>
            </div>

            {/* Ratio Selection */}
            <div className="mb-6 bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-bold text-black mb-1">Tỉ lệ kiến thức chung</label>
                    <p className="text-xs text-black">Chọn cách phân bổ mức độ câu hỏi (Nhận biết - Thông hiểu - Vận dụng).</p>
                  </div>
                  <div className="flex p-1 bg-sky-100 rounded-lg border border-sky-300">
                    <button
                      onClick={() => setInputData(prev => ({ ...prev, ratioMode: 'auto' }))}
                      className={`px-3 py-1.5 text-xs font-bold transition-all ${inputData.ratioMode === 'auto' ? 'bg-white text-black shadow-sm rounded-md' : 'text-black hover:text-sky-700'}`}
                    >
                      Tự động (theo %)
                    </button>
                    <button
                      onClick={() => setInputData(prev => ({ ...prev, ratioMode: 'manual' }))}
                      className={`px-3 py-1.5 text-xs font-bold transition-all ${inputData.ratioMode === 'manual' ? 'bg-white text-black shadow-sm rounded-md' : 'text-black hover:text-sky-700'}`}
                    >
                      Thủ công (tùy chỉnh)
                    </button>
                  </div>
                </div>

                {inputData.ratioMode === 'auto' ? (
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-bold text-black uppercase mb-4">
                      Tỉ lệ phần trăm các mức độ (Nhận biết - Thông hiểu - Vận dụng) có trong đề kiểm tra
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-[10px] font-bold text-black uppercase mb-1">Nhận biết (%)</label>
                        <input 
                          type="number"
                          value={inputData.percentages.biet} 
                          onChange={(e) => handlePercentageChange('biet', parseInt(e.target.value) || 0)}
                          className="w-full p-2 rounded border border-red-100 bg-white text-red-900 font-bold focus:ring-2 focus:ring-red-500 outline-none text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-black uppercase mb-1">Thông hiểu (%)</label>
                        <input 
                          type="number"
                          value={inputData.percentages.hieu} 
                          onChange={(e) => handlePercentageChange('hieu', parseInt(e.target.value) || 0)}
                          className="w-full p-2 rounded border border-red-100 bg-white text-red-900 font-bold focus:ring-2 focus:ring-red-500 outline-none text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-black uppercase mb-1">Vận dụng (%)</label>
                        <input 
                          type="number"
                          value={inputData.percentages.van_dung} 
                          onChange={(e) => handlePercentageChange('van_dung', parseInt(e.target.value) || 0)}
                          className="w-full p-2 rounded border border-red-100 bg-white text-red-900 font-bold focus:ring-2 focus:ring-red-500 outline-none text-center"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className={`text-center py-1 px-2 rounded text-[10px] font-bold ${inputData.percentages.biet + inputData.percentages.hieu + inputData.percentages.van_dung === 100 ? 'bg-white border border-emerald-200 text-emerald-700' : 'bg-white border border-red-200 text-red-700'}`}>
                          Tổng: {inputData.percentages.biet + inputData.percentages.hieu + inputData.percentages.van_dung}%
                        </div>
                        <button 
                          onClick={applyPercentages}
                          className="w-full py-2 bg-sky-100 text-black border border-sky-300 rounded-lg hover:bg-sky-200 transition-colors text-xs font-bold shadow-sm"
                        >
                          Áp dụng & Phân bổ
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-200">
                    <div>
                      <p className="text-xs font-semibold text-red-600 uppercase mb-1">Tỉ lệ hiện tại (đang tính toán)</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-black">{calculateCurrentRatio()}</span>
                        <span className="text-[10px] text-black font-medium">(Nhận biết - Thông hiểu - Vận dụng)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-black italic">Điều chỉnh số lượng câu hỏi bên dưới,<br/>tỉ lệ sẽ tự động cập nhật.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {inputData.ratioMode === 'manual' && (
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
                {inputData.enabledTypes.type1 && renderQuestionConfigRow("Dạng I (4 lựa chọn)", "type1", 8, 4, 0)}
                {inputData.enabledTypes.type2 && renderType2ConfigRow()}
                {inputData.enabledTypes.type3 && renderQuestionConfigRow("Dạng III (Trả lời ngắn)", "type3", 1, 1, 2)}
                {inputData.enabledTypes.essay && renderQuestionConfigRow("Tự luận", "essay", 0, 1, 2)}
                
                {!Object.values(inputData.enabledTypes).some(v => v) && (
                  <p className="text-center text-sm text-black py-4 italic">Vui lòng chọn ít nhất một dạng câu hỏi ở trên.</p>
                )}
              </div>
            )}
          </div>

          <div className="pt-6 flex justify-end">
            <Button
              onClick={handleGenerateMatrix}
              isLoading={genState.isLoading}
              disabled={selectedLessonIds.size === 0 || !Object.values(inputData.enabledTypes).some(v => v)}
              icon={<ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto px-8 py-3 text-lg shadow-lg shadow-sky-100"
            >
              Tạo Ma trận đề thi
            </Button>
          </div>
        </>
      ) : (
        /* Matrix/Specs Tab Content */
        <div className={themeClasses.card}>
          <h2 className="text-xl font-bold mb-6 flex items-center justify-center gap-2 uppercase">
            <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold ${themeClasses.badge}`}>1</span>
            Upload Ma trận hoặc Bảng đặc tả
          </h2>
          
          <div className="mb-6">
            <p className="text-black mb-4">
              Nếu bạn đã có sẵn file Ma trận hoặc Bảng đặc tả, hãy tải lên tại đây để hệ thống tiếp tục xử lý (Tạo Đặc tả hoặc Tạo Đề thi).
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Cấp học</label>
                <select name="educationLevel" value={inputData.educationLevel} onChange={handleInputChange} className={`w-full p-3 bg-white ${themeClasses.input}`}>
                  {EDUCATION_LEVELS.map(level => (
                    <option key={level.id} value={level.id}>{level.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Lớp học</label>
                <select name="grade" value={inputData.grade} onChange={handleInputChange} className={`w-full p-3 bg-white ${themeClasses.input}`}>
                  {GRADES[inputData.educationLevel]?.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Môn học</label>
                <select name="subject" value={inputData.subject} onChange={handleInputChange} className={`w-full p-3 bg-white ${themeClasses.input}`}>
                  {SUBJECTS[inputData.educationLevel]?.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-8 border-2 border-dashed border-blue-200 rounded-lg bg-white text-center relative hover:bg-blue-50 transition-colors">
              <input
                type="file"
                ref={matrixDirectUploadRef}
                onChange={handleMatrixSkipUpload}
                className="hidden"
                id="matrix-upload-tab"
                accept=".html,.txt,.pdf,.docx,.doc"
              />
              <label htmlFor="matrix-upload-tab" className="cursor-pointer flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-white border border-blue-200 rounded-full flex items-center justify-center mb-4 text-black">
                  <FileUp className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-black mb-2">Tải lên Ma trận / Đặc tả</h3>
                <p className="text-sm text-black max-w-md mx-auto">
                  Hỗ trợ file .docx, .pdf, .html. Hệ thống sẽ phân tích và chuyển sang bước tiếp theo.
                </p>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContentStep = (
    title: string,
    content: string,
    onNext: () => void,
    nextLabel: string,
    isLastStep: boolean = false,
    onUpdateContent: (val: string) => void
  ) => (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col p-4 sm:p-6">
      <div className={`flex justify-between items-center mb-4 ${themeClasses.card} p-4 flex-shrink-0`}>
        <h2 className="text-xl font-bold text-black flex items-center gap-2">
          <span className={`w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0 ${themeClasses.badge}`}>
            {currentStep + 1}
          </span>
          {title}
        </h2>
        <div className="flex gap-3">
          {/* Upload Matrix Button - Only for Matrix Step */}
          {currentStep === AppStep.MATRIX && (
            <>
              <input
                type="file"
                ref={matrixUploadRef}
                onChange={handleMatrixUpload}
                className="hidden"
                accept=".html,.txt,.pdf,.docx,.doc"
              />
              <Button
                variant="secondary"
                onClick={() => matrixUploadRef.current?.click()}
                icon={<Upload className="w-4 h-4" />}
                isLoading={genState.isLoading}
              >
                Upload Ma trận
              </Button>
            </>
          )}

          <Button variant="secondary" onClick={() => handleDownloadWord(content, title)} icon={<FileText className="w-4 h-4" />}>
            Tải Word (.doc)
          </Button>

          <Button variant="secondary" onClick={() => {
            const blob = new Blob([content], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title}.html`;
            a.click();
          }} icon={<Download className="w-4 h-4" />}>
            Tải HTML
          </Button>
          {!isLastStep && (
            <Button onClick={onNext} isLoading={genState.isLoading} icon={<ArrowRight className="w-4 h-4" />}>
              {nextLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2">
        {/* Editor Side */}
        <div className={`flex flex-col h-full overflow-hidden ${themeClasses.card} p-0`}>
          <div className="bg-white px-4 py-2 border-b border-slate-200 flex-shrink-0 flex justify-between items-center">
            <label className="text-xs font-bold text-black uppercase tracking-wider">Source Code (HTML/Markdown)</label>
          </div>
          <textarea
            className="flex-1 w-full p-4 font-mono text-xs sm:text-sm focus:outline-none resize-none leading-relaxed text-black bg-white"
            value={content}
            onChange={(e) => onUpdateContent(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Preview Side */}
        <div className={`flex flex-col h-full overflow-hidden ${themeClasses.card} p-0`}>
          <div className="bg-white px-4 py-2 border-b border-teal-100 flex-shrink-0">
            <label className="text-xs font-bold text-primary uppercase tracking-wider">Xem trước</label>
          </div>
          <div className="flex-1 overflow-auto bg-white p-2">
            <MarkdownView content={content} />
          </div>
        </div>
      </div>
    </div>
  );

  const handleReset = () => {
    if (window.confirm("Tạo mới sẽ xóa toàn bộ dữ liệu hiện tại?")) {
      setInputData({
        educationLevel: 'THCS',
        subject: 'Toán', 
        grade: 'Lớp 6', 
        duration: 45, 
        examType: 'Giữa kỳ 1', 
        model: DEFAULT_MODEL,
        topics: '', 
        additionalNotes: '',
        chapters: [],
        ratioMode: 'auto',
        knowledgeRatio: '4-3-3',
        percentages: { biet: 40, hieu: 30, van_dung: 30 },
        hasSpecialNeedsStudents: false,
        enabledTypes: {
          type1: true,
          type2: true,
          type3: true,
          essay: true,
        },
        questionConfig: {
          type1: { biet: 8, hieu: 4, van_dung: 0 },
          type2: { 
            count: 4, 
            counts: { biet: 6, hieu: 6, van_dung: 4 },
          },
          type3: { biet: 1, hieu: 1, van_dung: 2 },
          essay: { biet: 0, hieu: 1, van_dung: 2 },
        }
      });
      setUploadedFileName(null);
      setCurrentStep(AppStep.INPUT);
      setCompletedSteps(0);
      setSelectedLessonIds(new Set());
      setExpandedChapterIds(new Set());
    }
  }

  return (
    <ThemeContext.Provider value={theme}>
      <div className={`h-screen w-full flex flex-col overflow-hidden ${themeClasses.container}`}>
        {/* API Key Modal */}
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">Cài đặt & API Key</h2>
                  <p className="text-sm text-black">Cấu hình mô hình AI và API Key</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Mô hình AI (Model)</label>
                  <select 
                    name="model" 
                    value={inputData.model} 
                    onChange={handleInputChange} 
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary outline-none bg-white font-medium text-sm"
                  >
                    {MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-black mt-1">Chọn mô hình phù hợp với nhu cầu (Pro: Chất lượng cao, Flash: Tốc độ nhanh)</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Google AI API Key</label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                    placeholder="AIzaSy..."
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary outline-none bg-white font-mono text-sm"
                    autoFocus
                  />
                </div>
                <a
                  href="https://aistudio.google.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Lấy API Key miễn phí tại Google AI Studio
                </a>
                <Button onClick={handleSaveApiKey} disabled={!tempApiKey.trim()} className="w-full py-3" icon={<Check className="w-4 h-4" />}>
                  Lưu Cài đặt & Bắt đầu
                </Button>
                {apiKey && (
                  <button onClick={() => setShowApiKeyModal(false)} className="w-full text-center text-sm text-black hover:text-slate-800 py-2">
                    Đóng
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className={`${themeClasses.header} shrink-0 z-20`}>
          <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between relative">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 ${theme === 'classic' ? 'bg-sky-100 rounded-none border-2 border-black' : 'bg-sky-100 rounded-lg border border-sky-300'} flex items-center justify-center text-black font-bold text-lg`}>
                AI
              </div>
              <div className="lg:hidden">
                <h1 className="text-lg font-bold text-black leading-tight flex items-center gap-2 uppercase">
                  <FileSignature className="w-5 h-5 text-red-600" />
                  Tiện ích DeKiemTra
                </h1>
                <p className="text-[10px] text-black font-medium flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Chuẩn theo công văn 7991 của BGD-ĐT
                </p>
              </div>
            </div>

            <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <h1 className="text-lg font-bold text-black leading-tight flex items-center gap-2 uppercase">
                <FileSignature className="w-5 h-5 text-red-600" />
                Tiện ích DeKiemTra
              </h1>
              <p className="text-[10px] text-black font-medium flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Chuẩn theo công văn 7991 của BGD-ĐT
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Switcher */}
              <div className={`flex p-1 mr-2 ${theme === 'classic' ? 'bg-white border-2 border-black' : 'bg-white rounded-lg border border-slate-200'}`}>
                <button
                  onClick={() => setTheme('modern')}
                  className={`px-3 py-1 text-xs font-bold transition-all ${theme === 'modern' ? 'bg-sky-100 text-black shadow-sm rounded-md border border-sky-200' : 'text-black hover:bg-sky-50'}`}
                >
                  Modern
                </button>
                <button
                  onClick={() => setTheme('classic')}
                  className={`px-3 py-1 text-xs font-bold transition-all ${theme === 'classic' ? 'bg-sky-100 text-black border-2 border-black' : 'text-black hover:bg-sky-50'}`}
                >
                  Classic
                </button>
              </div>

              <button
                onClick={() => { setTempApiKey(apiKey || ''); setShowApiKeyModal(true); }}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 h-9 transition-colors ${theme === 'classic' ? 'bg-sky-100 border-2 border-black hover:bg-sky-200' : 'bg-sky-100 rounded-lg border border-sky-300 hover:bg-sky-200'}`}
              >
                <Settings className="w-4 h-4 text-black" />
                {!apiKey && <span className="text-red-500 font-medium text-xs">Lấy API key để sử dụng app</span>}
                {apiKey && <span className="text-black font-medium text-xs">Cài đặt API Key</span>}
              </button>
              <Button variant="secondary" onClick={handleReset} icon={<RotateCcw className="w-4 h-4" />} className={`text-sm px-3 py-1.5 h-9 ${theme === 'classic' ? 'rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none' : ''}`}>
                Tạo mới
              </Button>
            </div>
          </div>
        </header>

        {/* Progress */}
        <div className={`shrink-0 bg-white ${themeClasses.stepIndicator}`}>
          <StepIndicator currentStep={currentStep} setStep={setCurrentStep} completedSteps={completedSteps} />
        </div>

        {/* Main Content */}
        <main className="flex-1 relative w-full overflow-hidden">
          {/* Error Toast */}
          {genState.error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-bounce">
              <AlertCircle className="w-5 h-5" /> {genState.error}
            </div>
          )}

          {currentStep === AppStep.INPUT && (
            <div className="absolute inset-0 overflow-y-auto p-4 bg-white">
              {renderInputStep()}
            </div>
          )}

          {currentStep === AppStep.MATRIX && (
            <div className="absolute inset-0 bg-white">
              {renderContentStep(
                "Ma trận đề thi",
                genState.matrix,
                handleGenerateSpecs,
                "Tiếp theo: Bảng đặc tả",
                false,
                (val) => setGenState(prev => ({ ...prev, matrix: val }))
              )}
            </div>
          )}

          {currentStep === AppStep.SPECS && (
            <div className="absolute inset-0 bg-white">
              {renderContentStep(
                "Bảng đặc tả",
                genState.specs,
                handleGenerateExam,
                "Tiếp theo: Đề thi",
                false,
                (val) => setGenState(prev => ({ ...prev, specs: val }))
              )}
            </div>
          )}

          {currentStep === AppStep.EXAM && (
            <div className="absolute inset-0 bg-white">
              {renderContentStep(
                "Đề thi hoàn chỉnh",
                genState.exam,
                () => { },
                "Hoàn tất",
                true,
                (val) => setGenState(prev => ({ ...prev, exam: val }))
              )}
            </div>
          )}
        </main>
      </div>
    </ThemeContext.Provider>
  );
};

export default App;
