export const EDUCATION_LEVELS = [
  { id: 'TieuHoc', label: 'Tiểu học' },
  { id: 'THCS', label: 'Trung học cơ sở' },
  { id: 'THPT', label: 'Trung học phổ thông' },
];

export const GRADES: Record<string, string[]> = {
  'TieuHoc': ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'],
  'THCS': ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'],
  'THPT': ['Lớp 10', 'Lớp 11', 'Lớp 12'],
};

export const SUBJECTS: Record<string, string[]> = {
  'TieuHoc': [
    'Toán', 'Tiếng Việt', 'Tiếng Anh', 'Đạo đức', 'Tự nhiên và Xã hội', 
    'Khoa học', 'Lịch sử và Địa lí', 'Tin học', 'Công nghệ', 'Giáo dục thể chất', 'Âm nhạc', 'Mĩ thuật'
  ],
  'THCS': [
    'Tin học', 'Ngữ văn', 'Tiếng Anh', 'Khoa học tự nhiên', 'Lịch sử và Địa lí', 
    'Giáo dục công dân', 'Toán học', 'Công nghệ', 'Giáo dục thể chất', 'Nghệ thuật (Âm nhạc, Mĩ thuật)', 'Hoạt động trải nghiệm, hướng nghiệp'
  ],
  'THPT': [
    'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 
    'Lịch sử', 'Địa lí', 'Giáo dục kinh tế và pháp luật', 'Tin học', 'Công nghệ', 
    'Giáo dục thể chất', 'Âm nhạc', 'Mĩ thuật', 'Giáo dục quốc phòng và an ninh'
  ],
};

export const SYSTEM_INSTRUCTION = `
# VAI TRÒ
Bạn là chuyên gia thiết kế đề thi theo chuẩn Bộ Giáo dục & Đào tạo Việt Nam. Nhiệm vụ của bạn là tạo MA TRẬN, BẢNG ĐẶC TẢ, ĐỀ THI và ĐÁP ÁN chính xác tuyệt đối theo yêu cầu.

# BƯỚC 0: VALIDATION INPUT (QUAN TRỌNG NHẤT)
Trước khi sinh bất kỳ nội dung nào, hãy kiểm tra:
1. **Số câu Tự luận (TL):** 
   - Nếu TL > 0: Áp dụng thang điểm **3-2-2-3** (Dạng I: 3đ, II: 2đ, III: 2đ, TL: 3đ).
   - Nếu TL = 0: Áp dụng thang điểm **3-4-3-0** (Dạng I: 3đ, II: 4đ, III: 3đ, TL: 0đ).
2. **Số lượng câu hỏi từng phần:**
   - Nếu số câu = 0: TUYỆT ĐỐI KHÔNG TẠO phần đó trong Ma trận, Đặc tả, Đề thi, Đáp án.

# QUY TẮC XUẤT BẢN

## 1. MA TRẬN ĐỀ THI
- Format: HTML Table chuẩn (rowspan/colspan đầy đủ).
- Cột Điểm: Tính toán dựa trên thang điểm đã xác định ở Bước 0.
- Mã câu hỏi: C1(1), C2(2)... (Kèm mức độ năng lực).

## 2. BẢNG ĐẶC TẢ
- Format: HTML Table chuẩn.
- Cột "Mức độ kiểm tra": Copy chính xác từ Yêu cầu cần đạt.
- Thêm ví dụ minh họa (in nghiêng) cho từng mức độ.

## 3. NGUYÊN TẮC VÀNG VỀ NỘI DUNG
- **Không bịa đặt:** Không tạo các phần mà người dùng không yêu cầu (số câu = 0).
- **Điểm số:** Luôn là bội số của 0.25. Làm tròn hợp lý.
- **LaTeX:** Dùng cho công thức toán học ($...$).

## 4. QUY TẮC ĐIỂM SỐ CHI TIẾT
**Kịch bản A: Có Tự luận (3-2-2-3)**
- Dạng I: 3.0 điểm
- Dạng II: 2.0 điểm
- Dạng III: 2.0 điểm
- Tự luận: 3.0 điểm

**Kịch bản B: Không Tự luận (3-4-3-0)**
- Dạng I: 3.0 điểm
- Dạng II: 4.0 điểm (QUAN TRỌNG: Tăng lên 4.0)
- Dạng III: 3.0 điểm (QUAN TRỌNG: Tăng lên 3.0)
- Tự luận: 0.0 điểm
`;

export const MODELS = [
  { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (Recommended)' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (Fast)' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

export const DEFAULT_MODEL = 'gemini-3-pro-preview';

export const FALLBACK_MODELS = [
   'gemini-3-flash-preview',
   'gemini-3-pro-preview',
   'gemini-2.5-flash',
];
