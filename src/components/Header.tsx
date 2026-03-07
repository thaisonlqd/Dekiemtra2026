import { FileText, GraduationCap } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ExamGen VN</h1>
            <p className="text-xs text-gray-500 font-medium">Chuẩn Bộ GD&ĐT</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="#" 
            className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors hidden sm:block"
          >
            Hướng dẫn
          </a>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Mẫu đề thi</span>
          </button>
        </div>
      </div>
    </header>
  );
}
