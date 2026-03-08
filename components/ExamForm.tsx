import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ExamConfig {
  subject: string;
  topic: string;
  grade: string;
  part1Count: number;
  part2Count: number;
  part3Count: number;
  essayCount: number;
  additionalNotes?: string;
}

interface ExamFormProps {
  onSubmit: (config: ExamConfig) => void;
  isLoading: boolean;
}

export function ExamForm({ onSubmit, isLoading }: ExamFormProps) {
  const [config, setConfig] = useState<ExamConfig>({
    subject: 'Toán học',
    topic: 'Phương trình bậc nhất một ẩn',
    grade: '9',
    part1Count: 12,
    part2Count: 4,
    part3Count: 6,
    essayCount: 0,
    additionalNotes: '',
  });

  const SUBJECTS = [
    "Toán học",
    "Ngữ văn",
    "Tiếng Anh",
    "Khoa học tự nhiên",
    "Lịch sử và Địa lí",
    "Giáo dục công dân",
    "Tin học",
    "Công nghệ",
    "Giáo dục thể chất",
    "Nghệ thuật",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-100 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          Cấu hình đề thi
        </h2>
        <p className="text-sm text-gray-500 mt-1">Nhập thông tin để tạo ma trận và đề thi tự động</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Môn học</label>
            <select
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
              value={config.subject}
              onChange={(e) => setConfig({ ...config, subject: e.target.value })}
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Khối lớp</label>
            <select
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
              value={config.grade}
              onChange={(e) => setConfig({ ...config, grade: e.target.value })}
            >
              {[6, 7, 8, 9].map((g) => (
                <option key={g} value={g}>Lớp {g}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Chủ đề / Nội dung kiểm tra</label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="Ví dụ: Phương trình bậc nhất, Chiến tranh thế giới thứ hai..."
            value={config.topic}
            onChange={(e) => setConfig({ ...config, topic: e.target.value })}
          />
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Cấu trúc đề thi</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Phần I (TN nhiều lựa chọn)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.part1Count}
                onChange={(e) => setConfig({ ...config, part1Count: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Phần II (TN Đúng/Sai)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.part2Count}
                onChange={(e) => setConfig({ ...config, part2Count: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Phần III (TN Trả lời ngắn)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.part3Count}
                onChange={(e) => setConfig({ ...config, part3Count: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Phần Tự luận</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.essayCount}
                onChange={(e) => setConfig({ ...config, essayCount: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Ghi chú thêm (Tùy chọn)</label>
          <textarea
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all min-h-[80px]"
            placeholder="Ví dụ: Tập trung vào vận dụng cao, không ra phần giảm tải..."
            value={config.additionalNotes}
            onChange={(e) => setConfig({ ...config, additionalNotes: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full py-3 px-4 rounded-xl text-black font-bold text-lg shadow-lg shadow-sky-100 transition-all transform active:scale-[0.98] border border-sky-300",
            isLoading 
              ? "bg-sky-50 cursor-not-allowed" 
              : "bg-sky-100 hover:bg-sky-200"
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang khởi tạo đề thi...
            </span>
          ) : (
            "Tạo Đề Thi Ngay"
          )}
        </button>
      </form>
    </motion.div>
  );
}
