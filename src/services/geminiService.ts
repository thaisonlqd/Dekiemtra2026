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
  const { enabledTypes, scores } = data;
  let tnPoints = 0;
  let totalPoints = 0;

  if (enabledTypes.type1) {
    tnPoints += scores.type1;
    totalPoints += scores.type1;
  }
  if (enabledTypes.type2) {
    tnPoints += scores.type2;
    totalPoints += scores.type2;
  }
  if (enabledTypes.type3) {
    tnPoints += scores.type3;
    totalPoints += scores.type3;
  }
  if (enabledTypes.essay) {
    totalPoints += scores.essay;
  }
  
  if (totalPoints === 0) return { tnPercent: 0, tlPercent: 0 };

  const tnPercent = Math.round((tnPoints / totalPoints) * 100);
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

  // Fixed Header Construction for 7991 Format
  const fullHeader = getHeaderTemplate(data, "MA TRẬN ĐỀ");

  const headerHtml = `
  <thead>
    <tr>
      <th rowspan="4">TT</th>
      <th rowspan="4">Chủ đề/Chương</th>
      <th rowspan="4">Nội dung/đơn vị kiến thức</th>
      <th colspan="12">Mức độ đánh giá</th>
      <th colspan="3" rowspan="3">Tổng</th>
      <th rowspan="4">Tỉ lệ %<br>điểm</th>
    </tr>
    <tr>
      <th colspan="9">TNKQ</th>
      <th colspan="3" rowspan="2">Tự luận</th>
    </tr>
    <tr>
      <th colspan="3">Nhiều lựa chọn</th>
      <th colspan="3">"Đúng - Sai"</th>
      <th colspan="3">Trả lời ngắn</th>
    </tr>
    <tr>
      <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
      <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
      <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
      <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
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
    
    Cấu trúc câu hỏi và điểm số:
    ${enabledTypes.type1 ? `- Dạng I (TN nhiều lựa chọn): ${JSON.stringify(data.questionConfig.type1)}. Tổng điểm phần này: ${data.scores.type1} điểm.` : ''}
    ${enabledTypes.type2 ? `- Dạng II (TN Đúng/Sai): ${data.questionConfig.type2.count} câu. Tổng ${data.questionConfig.type2.count * 4} ý.
      Phân bổ số ý: Biết ${data.questionConfig.type2.counts.biet}, Hiểu ${data.questionConfig.type2.counts.hieu}, Vận dụng ${data.questionConfig.type2.counts.van_dung}. Tổng điểm phần này: ${data.scores.type2} điểm.` : ''}
    ${enabledTypes.type3 ? `- Dạng III (TN Trả lời ngắn): ${JSON.stringify(data.questionConfig.type3)}. Tổng điểm phần này: ${data.scores.type3} điểm.` : ''}
    ${enabledTypes.essay ? `- Tự luận: ${JSON.stringify(data.questionConfig.essay)}. Tổng điểm phần này: ${data.scores.essay} điểm.` : ''}
    
    Ghi chú thêm: ${data.additionalNotes}
    
    ${data.sourceMaterials && data.sourceMaterials.length > 0 ? `
    NGUỒN DỮ LIỆU THAM KHẢO:
    Sử dụng nội dung từ các tài liệu sau đây để phân bổ nội dung kiến thức cho phù hợp.
    ${data.sourceMaterials.map(m => `--- Bắt đầu nội dung file: ${m.fileName} ---\n${m.content}\n--- Kết thúc nội dung file: ${m.fileName} ---`).join('\n\n')}
    ` : `
    KHÔNG CÓ TÀI LIỆU THAM KHẢO:
    Hãy sử dụng kiến thức chuyên môn của bạn về chương trình giáo dục phổ thông hiện hành để xây dựng nội dung phù hợp với Khối lớp và Môn học đã chọn.
    `}
    
    YÊU CẦU VỀ ĐỊNH DẠNG (QUAN TRỌNG - TUÂN THỦ MẪU 7991):
    - Tạo bảng Ma trận đề thi dạng HTML Table.
    - BẮT BUỘC chèn đoạn Header sau vào ĐẦU output (trước thẻ table):
    ${fullHeader}
    
    - BẮT BUỘC sử dụng cấu trúc Header của bảng sau (Copy y nguyên):
    ${headerHtml}
    
    - CẤU TRÚC CÁC CỘT (19 CỘT):
      1. TT
      2. Chủ đề/Chương
      3. Nội dung/đơn vị kiến thức
      4-6. TNKQ Nhiều lựa chọn (Biết, Hiểu, Vận dụng)
      7-9. TNKQ Đúng/Sai (Biết, Hiểu, Vận dụng)
      10-12. TNKQ Trả lời ngắn (Biết, Hiểu, Vận dụng)
      13-15. Tự luận (Biết, Hiểu, Vận dụng)
      16-18. Tổng (Biết, Hiểu, Vận dụng) -> Tổng hợp số câu/ý của dòng đó theo từng mức độ.
      19. Tỉ lệ % điểm

    - QUY ĐỊNH GHI NỘI DUNG TRONG CÁC Ô (Cột 4-15):
      + Nếu có câu hỏi, ghi số lượng (ví dụ: "2", "4").
      + Nếu không có, để trống.
      + Lưu ý: Cột Đúng/Sai đếm theo số Ý. Các cột khác đếm theo số CÂU.

    - Phân bổ số câu hỏi vào các bài học/chủ đề dựa trên thời lượng và tầm quan trọng.
    - Đảm bảo tổng số câu khớp với cấu hình.
    - Cuối bảng phải có các hàng tổng kết chính xác:
      1. Hàng "Tổng số câu": Tổng kết lại số câu/ý cho từng cột.
      2. Hàng "Tổng số điểm": Tổng điểm tương ứng cho từng cột.
      3. Hàng "Tỉ lệ %": Tỉ lệ phần trăm điểm số cho từng cột.
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

  // Fixed Header Construction for Specs (7991 Format)
  const fullHeader = getHeaderTemplate(data, "BẢN ĐẶC TẢ KỸ THUẬT ĐỀ");

  const headerHtml = `
  <thead>
    <tr>
      <th rowspan="4">TT</th>
      <th rowspan="4">Chủ đề/Chương</th>
      <th rowspan="4">Nội dung/đơn vị kiến thức</th>
      <th rowspan="4">Yêu cầu cần đạt</th>
      <th colspan="12">Số câu hỏi ở các mức độ đánh giá</th>
    </tr>
    <tr>
      <th colspan="9">TNKQ</th>
      <th colspan="3" rowspan="2">Tự luận</th>
    </tr>
    <tr>
      <th colspan="3">Nhiều lựa chọn</th>
      <th colspan="3">"Đúng - Sai"</th>
      <th colspan="3">Trả lời ngắn</th>
    </tr>
    <tr>
      <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
      <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
      <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
      <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
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
    
    ${data.sourceMaterials && data.sourceMaterials.length > 0 ? `
    NGUỒN DỮ LIỆU THAM KHẢO:
    Sử dụng nội dung từ các tài liệu sau đây để xây dựng yêu cầu cần đạt cho phù hợp.
    ${data.sourceMaterials.map(m => `--- Bắt đầu nội dung file: ${m.fileName} ---\n${m.content}\n--- Kết thúc nội dung file: ${m.fileName} ---`).join('\n\n')}
    ` : `
    KHÔNG CÓ TÀI LIỆU THAM KHẢO:
    Hãy sử dụng kiến thức chuyên môn của bạn về chương trình giáo dục phổ thông hiện hành để xây dựng nội dung phù hợp với Khối lớp và Môn học đã chọn.
    `}
    
    YÊU CẦU:
    - Output dạng HTML Table.
    - BẮT BUỘC chèn đoạn Header sau vào ĐẦU output (trước thẻ table):
    ${fullHeader}
    
    - BẮT BUỘC sử dụng cấu trúc Header của bảng sau:
    ${headerHtml}
    
    - CẤU TRÚC CÁC CỘT (16 CỘT):
      1. TT
      2. Chủ đề/Chương
      3. Nội dung/đơn vị kiến thức
      4. Yêu cầu cần đạt
      5-7. TNKQ Nhiều lựa chọn (Biết, Hiểu, Vận dụng)
      8-10. TNKQ Đúng/Sai (Biết, Hiểu, Vận dụng)
      11-13. TNKQ Trả lời ngắn (Biết, Hiểu, Vận dụng)
      14-16. Tự luận (Biết, Hiểu, Vận dụng)

    - Cột "Yêu cầu cần đạt": Liệt kê các chuẩn kiến thức kĩ năng (Biết..., Hiểu..., Vận dụng...).
    - Các cột Mức độ đánh giá (Cột 5-16):
      + KHÔNG điền số lượng câu hỏi đơn thuần.
      + BẮT BUỘC điền MÃ CÂU HỎI cụ thể để thể hiện vị trí.
      + CHÚ Ý QUAN TRỌNG VỀ VỊ TRÍ CỘT:
        * Cột 11, 12, 13 là cho Trả lời ngắn (Biết, Hiểu, Vận dụng).
        * Cột 14, 15, 16 là cho Tự luận (Biết, Hiểu, Vận dụng).
        * TUYỆT ĐỐI KHÔNG ĐIỀN NHẦM CỘT.
      + Quy ước mã:
        * Dạng I (Nhiều lựa chọn): C1, C2, C3...
        * Dạng II (Đúng/Sai): Ghi rõ ý. Ví dụ: C1Y1 (Câu 1 Ý 1), C1Y2, C2Y3...
        * Dạng III (Trả lời ngắn): C... (Ví dụ: C1, C2 nếu đánh số tiếp theo, hoặc ghi rõ "TLN1", "TLN2" để phân biệt).
        * Tự luận: TL1...
      + Ví dụ: Nếu ô này có 2 câu là Câu 1 và Câu 5, hãy ghi: "C1, C5".
      + Nếu không có câu hỏi, để trống.

    - Cuối bảng có các hàng tổng kết: "Tổng số câu", "Tổng số điểm", "Tỉ lệ %" cho từng cột từ 5 đến 16.
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
    - TUYỆT ĐỐI KHÔNG sinh ra câu ghi chú kiểu như: "Lưu ý: Đề thi gồm 3 phần... Học sinh làm bài trực tiếp vào đề thi." ở đầu đề thi.
    
    ${data.sourceMaterials && data.sourceMaterials.length > 0 ? `
    NGUỒN DỮ LIỆU BIÊN SOẠN ĐỀ (BẮT BUỘC TUÂN THỦ):
    Bạn PHẢI sử dụng nội dung từ các tài liệu sau đây để tạo câu hỏi.
    TUYỆT ĐỐI KHÔNG được suy diễn kiến thức ngoài.
    CẤM TUYỆT ĐỐI lấy tài liệu, số liệu, hay thông tin từ bên ngoài nguồn dữ liệu này.
    Tất cả các câu hỏi phải được trích xuất và xây dựng dựa trên thông tin có trong các tài liệu dưới đây:
    
    ${data.sourceMaterials.map(m => `--- Bắt đầu nội dung file: ${m.fileName} ---\n${m.content}\n--- Kết thúc nội dung file: ${m.fileName} ---`).join('\n\n')}
    ` : ''}
    
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
                <div style="font-weight: bold;">NĂM HỌC 2025 - 2026</div>
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
            <strong>PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.</strong> Với dạng câu hỏi này học sinh thưc hiện chọn một phương án đúng duy nhất trong 4 phuong án ở mỗi câu.
            
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
            <strong>PHẦN II. Câu trắc nghiệm đúng sai.</strong> Với dạng câu hỏi này học sinh trả lời các câu dạng Đúng-Sai. Trong mỗi câu có 4 ý nhỏ em phải chọn ý  Đúng(ghi: Đ)/Sai(ghi: S) ở mỗi câu.
            
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

    YÊU CẦU VỀ HƯỚNG DẪN CHẤM (ANSWER KEY):
    1. Tạo bảng đáp án cho từng phần.
    2. ĐỐI VỚI PHẦN II (TRẮC NGHIỆM ĐÚNG/SAI):
       - BẮT BUỘC phải ghi dòng chú thích cách tính điểm như sau: "Mỗi câu hỏi 1 điểm gồm 4 ý nhỏ (a,b,c,d) học sinh trả lời đúng 1 ý được tính 0.25 điểm".
       - KHÔNG ĐƯỢC ghi là "Điểm tính theo số ý đúng trong mỗi câu" hay bất kỳ cách diễn đạt nào khác.
    3. Trình bày rõ ràng, dễ nhìn.

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

import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromFile(file: File): Promise<string> {
  const ai = getAIClient();
  
  if (file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } else if (file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } catch (error) {
      console.error("PDF extraction failed, falling back to Gemini:", error);
      // Fallback to Gemini if local parsing fails
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64 } },
            { text: "Extract all text from this document. Return only the text content without any formatting or markdown." }
          ]
        }
      });
      return response.text || "";
    }
  } else {
    // Assume text file
    return await file.text();
  }
}

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
