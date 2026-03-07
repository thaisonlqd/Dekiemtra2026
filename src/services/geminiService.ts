import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";
import { InputData, QuestionConfig } from "../types";
import { DEFAULT_MODEL, SYSTEM_INSTRUCTION } from "../constants";

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || process.env.GEMINI_API_KEY || null;
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

function getAIClient() {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not found. Please set it in settings.");
  return new GoogleGenAI({ apiKey });
}

function calculateTnlRatio(data: InputData) {
  const { enabledTypes, questionConfig } = data;
  let tnPoints = 0;
  if (enabledTypes.type1) tnPoints += (questionConfig.type1.biet + questionConfig.type1.hieu + questionConfig.type1.van_dung) * 0.25;
  if (enabledTypes.type2) tnPoints += questionConfig.type2.count * 1.0;
  if (enabledTypes.type3) tnPoints += (questionConfig.type3.biet + questionConfig.type3.hieu + questionConfig.type3.van_dung) * 0.25;
  
  // Heuristic: assume total 10 points
  const tnPercent = Math.min(100, Math.round((tnPoints / 10) * 100));
  const tlPercent = 100 - tnPercent;
  
  return { tnPercent, tlPercent };
}

function getHeaderTemplate(data: InputData, title: string) {
  const { tnPercent, tlPercent } = calculateTnlRatio(data);
  const schoolYear = "2025 - 2026"; // Placeholder or derive

  return `
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-family: 'Times New Roman', serif; color: #000;">
      <div style="text-align: center; width: 45%;">
          <div style="font-weight: bold; text-transform: uppercase;">TRƯỜNG THCS LÊ QUÝ ĐÔN</div>
          <div style="font-weight: bold; text-transform: uppercase;">TỔ KHOA HỌC TỰ NHIÊN</div>
          <div style="border-bottom: 1px solid black; width: 120px; margin: 5px auto;"></div>
      </div>
      <div style="text-align: center; width: 50%;">
          <div style="font-weight: bold; text-transform: uppercase;">${title}</div>
          <div style="font-weight: bold; text-transform: uppercase;">KIỂM TRA ${data.examType.toUpperCase()}, NĂM HỌC ${schoolYear}</div>
          <div style="font-weight: bold; text-transform: uppercase;">MÔN: <span style="border-bottom: 1px solid black;">${data.subject.toUpperCase()} ${data.grade.toUpperCase()}</span></div>
      </div>
  </div>
  <div style="margin-bottom: 20px; font-family: 'Times New Roman', serif; line-height: 1.6; color: #000; font-size: 14px;">
      <div>- <strong>Thời điểm kiểm tra:</strong> <span style="color: red; font-style: italic;">${data.examType}</span></div>
      <div>- <strong>Thời gian làm bài:</strong> <span style="color: red; font-style: italic;">${data.duration} phút.</span></div>
      <div>- <strong>Hình thức kiểm tra:</strong> <span style="color: red; font-style: italic;">Kết hợp giữa trắc nghiệm và tự luận (tỉ lệ ${tnPercent}% trắc nghiệm, ${tlPercent}% tự luận).</span></div>
      <div>- <strong>Cấu trúc:</strong> Mức độ đề: <span style="color: red; font-style: italic;">${data.percentages.biet}% Nhận biết; ${data.percentages.hieu}% Thông hiểu; ${data.percentages.van_dung}% Vận dụng</span></div>
  </div>`;
}

// --- Generation Functions ---

export async function generateStep1Matrix(data: InputData, selectedLessonIds: Set<string>): Promise<string> {
  const ai = getAIClient();
  const { enabledTypes } = data;
  
  // Filter selected lessons
  const selectedContent = data.chapters.map(chap => {
    const lessons = chap.lessons.filter(l => selectedLessonIds.has(l.id));
    if (lessons.length === 0) return null;
    return { ...chap, lessons };
  }).filter(Boolean);

  // Dynamic Header Construction
  const hasType1 = enabledTypes.type1;
  const hasType2 = enabledTypes.type2;
  const hasType3 = enabledTypes.type3;
  const hasEssay = enabledTypes.essay;

  let tnkqCols = 0;
  if (hasType1) tnkqCols += 3;
  if (hasType2) tnkqCols += 3;
  if (hasType3) tnkqCols += 3;

  const totalLevelCols = tnkqCols + (hasEssay ? 3 : 0);
  const fullHeader = getHeaderTemplate(data, "MA TRẬN ĐỀ");

  const headerHtml = `
  <thead>
    <tr>
      <th rowspan="4">TT</th>
      <th rowspan="4">Chủ đề/Chương</th>
      <th rowspan="4">Nội dung/đơn vị kiến thức</th>
      <th colspan="${totalLevelCols}">Mức độ đánh giá</th>
      <th colspan="3" rowspan="3">Tổng</th>
      <th rowspan="4">Tỉ lệ %<br>điểm</th>
    </tr>
    <tr>
      <th colspan="${tnkqCols}">TNKQ</th>
      ${hasEssay ? '<th colspan="3" rowspan="2">Tự luận</th>' : ''}
    </tr>
    <tr>
      ${hasType1 ? '<th colspan="3"><em>Nhiều lựa chọn</em></th>' : ''}
      ${hasType2 ? '<th colspan="3"><em>“Đúng – Sai”</em></th>' : ''}
      ${hasType3 ? '<th colspan="3"><em>Trả lời ngắn</em></th>' : ''}
    </tr>
    <tr>
      ${hasType1 ? '<th>Biết</th><th>Hiểu</th><th>Vận dụng</th>' : ''}
      ${hasType2 ? '<th>Biết</th><th>Hiểu</th><th>Vận dụng</th>' : ''}
      ${hasType3 ? '<th>Biết</th><th>Hiểu</th><th>Vận dụng</th>' : ''}
      ${hasEssay ? '<th>Biết</th><th>Hiểu</th><th>Vận dụng</th>' : ''}
      <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
    </tr>
  </thead>`;

  const prompt = `
    TẠO MA TRẬN ĐỀ THI (BƯỚC 1)
    
    Môn: ${data.subject}
    Khối: ${data.grade}
    Thời gian: ${data.duration} phút
    Loại bài: ${data.examType}
    
    Nội dung kiến thức cần kiểm tra:
    ${JSON.stringify(selectedContent, null, 2)}
    
    Cấu trúc câu hỏi:
    ${enabledTypes.type1 ? `- Dạng I (TN nhiều lựa chọn): ${JSON.stringify(data.questionConfig.type1)}` : ''}
    ${enabledTypes.type2 ? `- Dạng II (TN Đúng/Sai): ${data.questionConfig.type2.count} câu. Tổng ${data.questionConfig.type2.count * 4} ý.
      Phân bổ số ý: Biết ${data.questionConfig.type2.counts.biet}, Hiểu ${data.questionConfig.type2.counts.hieu}, Vận dụng ${data.questionConfig.type2.counts.van_dung}.` : ''}
    ${enabledTypes.type3 ? `- Dạng III (TN Trả lời ngắn): ${JSON.stringify(data.questionConfig.type3)}` : ''}
    ${enabledTypes.essay ? `- Tự luận: ${JSON.stringify(data.questionConfig.essay)}` : ''}
    
    Ghi chú thêm: ${data.additionalNotes}
    
    YÊU CẦU:
    - Tạo bảng Ma trận đề thi dạng HTML Table.
    - BẮT BUỘC chèn đoạn Header sau vào ĐẦU output (trước thẻ table):
    ${fullHeader}
    
    - BẮT BUỘC sử dụng cấu trúc Header của bảng sau (Copy y nguyên):
    ${headerHtml}
    
    - Phân bổ số câu hỏi vào các bài học/chủ đề dựa trên thời lượng và tầm quan trọng.
    - Đảm bảo tổng số câu khớp với cấu hình.
    - Cuối bảng phải có các hàng tổng kết chính xác theo mẫu:
      1. Hàng "Tổng số câu": Tổng số câu hỏi cho từng cột mức độ.
      2. Hàng "Tổng số điểm": Tổng điểm tương ứng.
      3. Hàng "Tỉ lệ %": Tỉ lệ phần trăm điểm số.
    - Output CHỈ CHỨA mã HTML của bảng (thẻ table). KHÔNG được có bất kỳ văn bản dẫn nhập, giải thích, markdown code block hay ghi chú nào khác.
  `;

  const response = await ai.models.generateContent({
    model: data.model || DEFAULT_MODEL,
    contents: prompt,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });

  // Clean up response if it still contains markdown
  let text = response.text || "";
  text = text.replace(/```html/g, '').replace(/```/g, '');
  return text;
}

export async function generateStep2Specs(matrixHtml: string, data: InputData, selectedLessonIds: Set<string>): Promise<string> {
  const ai = getAIClient();
  const { enabledTypes } = data;

  // Dynamic Header Construction for Specs
  const hasType1 = enabledTypes.type1;
  const hasType2 = enabledTypes.type2;
  const hasType3 = enabledTypes.type3;
  const hasEssay = enabledTypes.essay;

  let tnkqCols = 0;
  if (hasType1) tnkqCols += 3;
  if (hasType2) tnkqCols += 3;
  if (hasType3) tnkqCols += 3;

  const totalLevelCols = tnkqCols + (hasEssay ? 3 : 0);
  const fullHeader = getHeaderTemplate(data, "BẢN ĐẶC TẢ KỸ THUẬT ĐỀ");

  const headerHtml = `
  <thead>
    <tr>
      <th rowspan="4">TT</th>
      <th rowspan="4">Chủ đề/Chương</th>
      <th rowspan="4">Nội dung/đơn vị kiến thức</th>
      <th rowspan="4">Yêu cầu cần đạt</th>
      <th colspan="${totalLevelCols}">Số câu hỏi ở các mức độ đánh giá</th>
    </tr>
    <tr>
      <th colspan="${tnkqCols}">TNKQ</th>
      ${hasEssay ? '<th colspan="3" rowspan="2">Tự luận</th>' : ''}
    </tr>
    <tr>
      ${hasType1 ? '<th colspan="3">Nhiều lựa chọn</th>' : ''}
      ${hasType2 ? '<th colspan="3">"Đúng - Sai"</th>' : ''}
      ${hasType3 ? '<th colspan="3">Trả lời ngắn</th>' : ''}
    </tr>
    <tr>
      ${hasType1 ? '<th>Biết</th><th>Hiểu</th><th>Vận dụng</th>' : ''}
      ${hasType2 ? '<th>Biết</th><th>Hiểu</th><th>Vận dụng</th>' : ''}
      ${hasType3 ? '<th>Biết</th><th>Hiểu</th><th>Vận dụng</th>' : ''}
      ${hasEssay ? '<th>Biết</th><th>Hiểu</th><th>Vận dụng</th>' : ''}
    </tr>
  </thead>`;
  
  const prompt = `
    TẠO BẢNG ĐẶC TẢ KỸ THUẬT (BƯỚC 2)
    
    Dựa trên Ma trận đề thi sau:
    ${matrixHtml}
    
    Hãy chi tiết hóa thành Bảng đặc tả kỹ thuật:
    - Mô tả chi tiết Yêu cầu cần đạt cho từng đơn vị kiến thức.
    - Xác định Mức độ kiểm tra (Nhận biết, Thông hiểu, Vận dụng).
    - Số câu hỏi cho từng mức độ.
    
    YÊU CẦU:
    - Output dạng HTML Table.
    - BẮT BUỘC chèn đoạn Header sau vào ĐẦU output (trước thẻ table):
    ${fullHeader}
    
    - BẮT BUỘC sử dụng cấu trúc Header của bảng sau:
    ${headerHtml}
    
    - Cột "Yêu cầu cần đạt": Liệt kê các chuẩn kiến thức kĩ năng (Biết..., Hiểu..., Vận dụng...).
    - Các cột Mức độ đánh giá:
      + KHÔNG điền số lượng câu hỏi đơn thuần.
      + BẮT BUỘC điền MÃ CÂU HỎI cụ thể để thể hiện vị trí.
      + Quy ước mã:
        * Dạng I (Nhiều lựa chọn): C1, C2, C3...
        * Dạng II (Đúng/Sai): Ghi rõ ý. Ví dụ: C1Y1 (Câu 1 Ý 1), C1Y2, C2Y3...
        * Dạng III (Trả lời ngắn): C...
        * Tự luận: TL1...
      + Ví dụ: Nếu ô này có 2 câu là Câu 1 và Câu 5, hãy ghi: "C1, C5".
    - Cuối bảng có các hàng tổng kết: "Tổng số câu", "Tổng số điểm", "Tỉ lệ %".
  `;

  const response = await ai.models.generateContent({
    model: data.model || DEFAULT_MODEL,
    contents: prompt,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });

  return response.text || "Không tạo được nội dung.";
}

export async function generateStep3Exam(specsHtml: string, data: InputData): Promise<string> {
  const ai = getAIClient();
  const { enabledTypes } = data;
  
  const prompt = `
    TẠO ĐỀ KIỂM TRA (BƯỚC 3) - TUÂN THỦ CẤU TRÚC CÔNG VĂN 7991/BGDĐT-GDTrH
    
    Dựa trên Bảng đặc tả sau:
    ${specsHtml}
    
    Hãy biên soạn ĐỀ KIỂM TRA và HƯỚNG DẪN CHẤM chi tiết.
    
    YÊU CẦU VỀ HÌNH THỨC (BẮT BUỘC):
    - Output là mã HTML thuần (không bọc trong \`\`\`html).
    - Sử dụng font 'Times New Roman'.
    - KHÔNG sử dụng thẻ <table> cho bố cục Header (để tránh lỗi hiển thị border). Sử dụng Flexbox.
    
    CẤU TRÚC ĐỀ THI (HTML MẪU):
    
    <div style="font-family: 'Times New Roman', serif; line-height: 1.3; color: #000;">
        <!-- HEADER -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="width: 40%; text-align: center;">
                <div style="font-weight: bold; text-transform: uppercase;">TRƯỜNG ........................</div>
                <div style="font-weight: bold;">TỔ ........................</div>
            </div>
            <div style="width: 60%; text-align: center;">
                <div style="font-weight: bold; text-transform: uppercase;">ĐỀ KIỂM TRA ${data.examType.toUpperCase()}</div>
                <div style="font-weight: bold;">NĂM HỌC 20... - 20...</div>
                <div style="font-weight: bold; text-transform: uppercase;">MÔN: ${data.subject.toUpperCase()} – LỚP: ${data.grade}</div>
            </div>
        </div>
        <div style="text-align: center; font-style: italic; margin-bottom: 15px;">
            Thời gian làm bài: ${data.duration} phút (Không kể thời gian giao đề)
        </div>

        <!-- SCORE BOX -->
        <div style="display: flex; border: 1px solid black; margin-bottom: 20px;">
            <div style="width: 150px; border-right: 1px solid black; padding: 5px;">
                <strong>ĐIỂM:</strong><br><br><br>
            </div>
            <div style="flex: 1; padding: 5px;">
                <strong>NHẬN XÉT CỦA THẦY/CÔ:</strong><br><br><br>
            </div>
        </div>

        ${enabledTypes.type1 ? `
        <!-- PHẦN I -->
        <div style="margin-bottom: 20px;">
            <strong>PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.</strong> Thí sinh trả lời từ câu 1 đến câu ... Mỗi câu hỏi thí sinh chỉ chọn một phương án.
            
            <!-- Loop questions -->
            <div style="margin-top: 10px;">
                <strong>Câu 1:</strong> Nội dung câu hỏi...<br>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 5px;">
                    <div>A. ...</div>
                    <div>B. ...</div>
                    <div>C. ...</div>
                    <div>D. ...</div>
                </div>
            </div>
        </div>
        ` : ''}

        ${enabledTypes.type2 ? `
        <!-- PHẦN II -->
        <div style="margin-bottom: 20px;">
            <strong>PHẦN II. Câu trắc nghiệm đúng sai.</strong> Thí sinh trả lời từ câu ... đến câu ... Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
            
            <!-- Loop questions -->
            <div style="margin-top: 10px;">
                <strong>Câu ...:</strong> Nội dung câu hỏi...<br>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 5px;">
                    <div>a) ...</div>
                    <div>b) ...</div>
                    <div>c) ...</div>
                    <div>d) ...</div>
                </div>
            </div>
        </div>
        ` : ''}

        ${enabledTypes.type3 ? `
        <!-- PHẦN III -->
        <div style="margin-bottom: 20px;">
            <strong>PHẦN III. Câu trắc nghiệm trả lời ngắn.</strong> Thí sinh trả lời từ câu ... đến câu ...
            
            <!-- Loop questions -->
            <div style="margin-top: 10px;">
                <strong>Câu ...:</strong> Nội dung câu hỏi...
            </div>
        </div>
        ` : ''}

        ${enabledTypes.essay ? `
        <!-- PHẦN TỰ LUẬN -->
        <div style="margin-bottom: 20px;">
            <strong>PHẦN TỰ LUẬN.</strong>
            <!-- Loop questions -->
            <div style="margin-top: 10px;">
                <strong>Câu ...:</strong> Nội dung câu hỏi...
            </div>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px; font-weight: bold;">
            ---HẾT---
        </div>
    </div>

    <!-- ANSWER KEY -->
    <div style="page-break-before: always; margin-top: 50px; font-family: 'Times New Roman', serif;">
        <h3 style="text-align: center; text-transform: uppercase; margin-bottom: 20px;">HƯỚNG DẪN CHẤM</h3>
        
        <!-- Generate tables for answers here -->
    </div>

    YÊU CẦU NỘI DUNG:
    1. Sinh câu hỏi dựa trên Bảng đặc tả đã cung cấp.
    2. Đảm bảo số lượng câu hỏi chính xác cho từng phần đã bật: ${JSON.stringify(enabledTypes)}.
    3. ĐỐI VỚI DẠNG II (Đúng/Sai): 
       - Mỗi câu hỏi phải là một BÀI TOÁN TÌNH HUỐNG cụ thể trong thực tế.
       - Sau tình huống là 4 ý (a, b, c, d) để học sinh chọn Đúng hoặc Sai.
       - 4 ý này phải được phân bổ đủ 3 mức độ: Nhận biết, Thông hiểu, Vận dụng (theo đúng số lượng đã quy định trong bảng đặc tả).
    4. Nội dung câu hỏi phải rõ ràng, chính xác, mang tính giáo dục.
    5. Đáp án phải chính xác và khớp với câu hỏi.
  `;

  const response = await ai.models.generateContent({
    model: data.model || DEFAULT_MODEL,
    contents: prompt,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });

  let text = response.text || "Không tạo được nội dung.";
  text = text.replace(/```html/g, '').replace(/```/g, '');
  return text;
}

// --- File Processing ---

export async function extractInfoFromDocument(file: File): Promise<Partial<InputData>> {
  const ai = getAIClient();
  let text = "";

  if (file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } else if (file.type === 'application/pdf') {
    // For PDF, we send the base64 directly to Gemini
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    });

    const prompt = `
      Phân tích tài liệu Kế hoạch dạy học (KHDH) này và trích xuất thông tin cấu trúc chương trình học.
      Trả về JSON với cấu trúc:
      {
        "subject": "Tên môn học",
        "grade": "Khối lớp",
        "chapters": [
          {
            "id": "c1",
            "name": "Tên chương/chủ đề",
            "totalPeriods": 10,
            "lessons": [
              { "id": "l1", "name": "Tên bài học", "periods": 2, "weekStart": 1, "weekEnd": 1 }
            ]
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Use flash for faster extraction
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64 } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: 'application/json' }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Error parsing JSON from PDF extraction", e);
      return {};
    }
  } else {
    throw new Error("Unsupported file type");
  }

  // For DOCX text content
  const prompt = `
    Phân tích nội dung văn bản Kế hoạch dạy học (KHDH) sau và trích xuất thông tin.
    Trả về JSON với cấu trúc:
    {
      "subject": "Tên môn học",
      "grade": "Khối lớp",
      "chapters": [
        {
          "id": "c1",
          "name": "Tên chương/chủ đề",
          "totalPeriods": 10,
          "lessons": [
            { "id": "l1", "name": "Tên bài học", "periods": 2, "weekStart": 1, "weekEnd": 1 }
          ]
        }
      ]
    }

    Nội dung:
    ${text.substring(0, 30000)} // Limit context
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Error parsing JSON from text extraction", e);
    return {};
  }
}

export async function convertMatrixFileToHtml(file: File): Promise<string> {
  const ai = getAIClient();
  let base64 = "";
  let mimeType = file.type;

  if (file.name.endsWith('.docx')) {
     // Convert docx to text first for better handling if possible, or just treat as binary if Gemini supports it?
     // Gemini doesn't support docx binary. We must extract text.
     const arrayBuffer = await file.arrayBuffer();
     const result = await mammoth.convertToHtml({ arrayBuffer });
     return result.value; // Mammoth converts to HTML directly!
  }

  // For PDF or Images
  base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  });

  const prompt = `
    Chuyển đổi hình ảnh/tài liệu Ma trận đề thi này thành mã HTML Table sạch, đẹp.
    Giữ nguyên cấu trúc và nội dung.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType, data: base64 } },
        { text: prompt }
      ]
    }
  });

  return response.text || "";
}
