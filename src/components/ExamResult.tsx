import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Download, Printer, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';

interface ExamResultProps {
  content: string;
}

export function ExamResult({ content }: ExamResultProps) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full"
    >
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm bg-opacity-90">
        <h2 className="text-lg font-semibold text-gray-900">Kết quả</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Sao chép Markdown"
          >
            {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
          </button>
          <button 
            onClick={handlePrint}
            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="In đề thi"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button 
            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Tải xuống (Coming soon)"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-8 overflow-auto max-h-[800px] print:max-h-none print:overflow-visible prose prose-indigo max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={{
            table: ({node, ...props}) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300 text-sm" {...props} />
              </div>
            ),
            thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
            th: ({node, ...props}) => <th className="border border-gray-300 px-4 py-2 font-semibold text-left" {...props} />,
            td: ({node, ...props}) => <td className="border border-gray-300 px-4 py-2" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}
