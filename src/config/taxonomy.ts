export interface SubtopicDefinition {
  name: string;
  keywords: string[];
  specificTopics?: {
    name: string;
    keywords: string[];
  }[];
}

export interface TopicDefinition {
  id: number;
  name: string;
  keywords: string[];
  subtopics: SubtopicDefinition[];
}

export interface ContextDefinition {
  name: string;
  keywords: string[];
}

export interface LocationDefinition {
  name: string;
  aliases: string[];
}

export const MOTHER_BABY_TAXONOMY: TopicDefinition[] = [
  {
    id: 1,
    name: "MẸ BẦU / THAI KỲ",
    keywords: ["mẹ bầu", "thai kỳ", "bà bầu", "mang thai", "mang bầu", "thai nhi", "mẹ mang thai", "bầu bí", "thai phụ"],
    subtopics: [
      { name: "Kiến thức thai kỳ", keywords: ["kiến thức thai kỳ", "cẩm nang mang thai", "lưu ý khi mang thai"] },
      { name: "Thai kỳ 3 tháng đầu", keywords: ["3 tháng đầu", "tam cá nguyệt thứ nhất", "tam cá nguyệt 1", "mới có bầu", "mới mang thai"] },
      { name: "Thai kỳ 3 tháng giữa", keywords: ["3 tháng giữa", "tam cá nguyệt thứ hai", "tam cá nguyệt 2"] },
      { name: "Thai kỳ 3 tháng cuối", keywords: ["3 tháng cuối", "tam cá nguyệt thứ ba", "tam cá nguyệt 3", "sắp sinh", "những tuần cuối thai kỳ"] },
      { name: "Sự phát triển của thai nhi", keywords: ["phát triển của thai nhi", "cân nặng thai nhi", "chiều dài thai nhi", "thai nhi theo tuần", "cử động thai", "thai máy"] },
      { name: "Dinh dưỡng thai kỳ", keywords: ["dinh dưỡng thai kỳ", "bầu ăn gì", "bà bầu nên ăn gì", "thực đơn cho bà bầu"] },
      { name: "Thực phẩm & đồ uống", keywords: ["thực phẩm cho bà bầu", "đồ uống cho bà bầu", "bầu uống gì", "nước dừa cho bà bầu", "sữa bầu"] },
      { name: "Vitamin & khoáng chất", keywords: ["vitamin cho bà bầu", "sắt cho bà bầu", "canxi cho bà bầu", "acid folic", "dha cho bà bầu"] },
      { name: "Sức khỏe thai kỳ", keywords: ["sức khỏe thai kỳ", "khỏe mạnh khi mang thai"] },
      { name: "Triệu chứng thai kỳ", keywords: ["nghén", "ốm nghén", "phù chân khi mang thai", "đau lưng khi mang thai", "chuột rút khi mang thai", "mệt mỏi khi mang thai"] },
      { name: "Bệnh lý thai kỳ", keywords: ["tiểu đường thai kỳ", "tiền sản giật", "dọa sảy thai", "thiếu máu thai kỳ"] },
      { name: "Khám thai", keywords: ["khám thai", "lịch khám thai", "mốc khám thai"] },
      { name: "Siêu âm & xét nghiệm", keywords: ["siêu âm thai", "siêu âm 4d", "siêu âm 5d", "xét nghiệm nipt", "double test", "triple test"] },
      { name: "Vận động khi mang thai", keywords: ["vận động khi mang thai", "bài tập cho bà bầu", "đi bộ khi mang thai"] },
      { name: "Yoga bầu", keywords: ["yoga bầu", "yoga cho bà bầu", "tập yoga mang thai"] },
      { name: "Massage bầu", keywords: ["massage bầu", "mát xa bầu", "xoa bóp cho bà bầu", "massage cho bà bầu"] },
      { name: "Chăm sóc cơ thể khi mang thai", keywords: ["chăm sóc cơ thể khi mang thai", "vệ sinh khi mang thai"] },
      { name: "Chăm sóc da khi mang thai", keywords: ["chăm sóc da khi mang thai", "rạn da khi mang thai", "kem trị rạn da", "mụn khi mang thai", "nám thai kỳ"] },
      { name: "Giấc ngủ khi mang thai", keywords: ["giấc ngủ khi mang thai", "mất ngủ khi mang thai", "tư thế ngủ cho bà bầu", "gối ôm bà bầu"] },
      { name: "Tâm lý khi mang thai", keywords: ["tâm lý khi mang thai", "stress khi mang thai", "trầm cảm khi mang thai", "lo âu khi mang thai"] },
      { name: "Chuẩn bị sinh", keywords: ["chuẩn bị sinh", "hành trang đi sinh", "chuẩn bị đi đẻ"] },
      { name: "Đồ dùng đi sinh", keywords: ["đồ dùng đi sinh", "giỏ đồ đi sinh", "danh sách đồ đi sinh", "chuẩn bị giỏ đồ đi đẻ"] },
      { name: "Sinh thường", keywords: ["sinh thường", "đẻ thường", "rạch tầng sinh môn"] },
      { name: "Sinh mổ", keywords: ["sinh mổ", "đẻ mổ", "vết mổ đẻ"] },
      { name: "Dấu hiệu chuyển dạ", keywords: ["dấu hiệu chuyển dạ", "chuyển dạ", "vỡ ối", "rỉ ối", "cơn gò chuyển dạ", "bong nút nhầy"] }
    ]
  },
  {
    id: 2,
    name: "TRẺ SƠ SINH",
    keywords: ["trẻ sơ sinh", "bé sơ sinh", "em bé sơ sinh", "con mới sinh", "trẻ mới đẻ", "newborn"],
    subtopics: [
      { name: "Chăm sóc trẻ sơ sinh", keywords: ["chăm sóc trẻ sơ sinh", "kinh nghiệm chăm bé sơ sinh", "cẩm nang trẻ sơ sinh"] },
      { name: "Tắm bé", keywords: ["tắm bé", "tắm trẻ sơ sinh", "cách tắm cho trẻ sơ sinh", "nhiệt độ nước tắm bé"] },
      { name: "Vệ sinh bé", keywords: ["vệ sinh bé", "vệ sinh trẻ sơ sinh", "lau người cho bé", "vệ sinh vùng kín cho bé"] },
      { name: "Chăm sóc rốn", keywords: ["chăm sóc rốn", "vệ sinh rốn", "rốn trẻ sơ sinh", "rốn chưa rụng", "rốn rỉ máu", "rốn có mủ"] },
      { name: "Chăm sóc da", keywords: ["chăm sóc da trẻ sơ sinh", "da bé sơ sinh", "dưỡng ẩm da bé"] },
      { name: "Hăm tã", keywords: ["hăm tã", "hăm bẹn", "kem trị hăm", "bé bị hăm", "chữa hăm tã"] },
      { name: "Rôm sảy", keywords: ["rôm sảy", "mụn kê", "rôm sảy ở trẻ sơ sinh", "lá tắm rôm sảy"] },
      { name: "Phát ban & mẩn đỏ", keywords: ["phát ban", "mẩn đỏ", "nổi mẩn đỏ", "viêm da cơ địa ở trẻ sơ sinh"] },
      { name: "Dinh dưỡng", keywords: ["dinh dưỡng trẻ sơ sinh", "chế độ ăn của trẻ sơ sinh"] },
      { name: "Sữa mẹ", keywords: ["sữa mẹ cho trẻ sơ sinh", "sữa non", "cách trữ sữa mẹ"] },
      { name: "Sữa công thức", keywords: ["sữa công thức cho trẻ sơ sinh", "cách pha sữa công thức", "sữa bột sơ sinh"] },
      { name: "Bú & cữ bú", keywords: ["cữ bú", "khớp ngậm", "bé không chịu bú", "bé lười bú", "khoảng cách cữ bú"] },
      { name: "Tiêu hóa", keywords: ["tiêu hóa của bé", "phân của trẻ sơ sinh", "đi ngoài ở trẻ sơ sinh"] },
      { name: "Táo bón", keywords: ["táo bón ở trẻ sơ sinh", "bé sơ sinh bị táo bón", "thụt hậu môn"] },
      { name: "Tiêu chảy", keywords: ["tiêu chảy ở trẻ sơ sinh", "bé đi ngoài phân lỏng", "tiêu chảy cấp"] },
      { name: "Trớ & nôn", keywords: ["trớ sữa", "nôn trớ", "trào ngược dạ dày thực quản ở trẻ sơ sinh", "vỗ ợ hơi"] },
      { name: "Giấc ngủ", keywords: ["giấc ngủ trẻ sơ sinh", "bé ngủ ngày cày đêm", "bé ngủ không sâu giấc", "giật mình khi ngủ"] },
      { name: "Lịch sinh hoạt", keywords: ["lịch sinh hoạt trẻ sơ sinh", "lịch easy cho trẻ sơ sinh", "luyện ngủ"] },
      { name: "Khóc & quấy", keywords: ["khóc dạ đề", "bé quấy khóc", "khóc đêm", "colic"] },
      { name: "Thân nhiệt", keywords: ["thân nhiệt trẻ sơ sinh", "bé sơ sinh bị sốt", "hạ sốt cho bé sơ sinh"] },
      { name: "Sức khỏe & bệnh thường gặp", keywords: ["bệnh trẻ sơ sinh", "sổ mũi ở trẻ sơ sinh", "nghẹt mũi trẻ sơ sinh", "vàng da sơ sinh"] },
      { name: "Tiêm chủng", keywords: ["tiêm chủng trẻ sơ sinh", "tiêm phòng lao", "tiêm viêm gan b sơ sinh"] },
      { name: "Phát triển thể chất", keywords: ["phát triển thể chất sơ sinh", "cân nặng bé sơ sinh", "chiều dài bé sơ sinh"] },
      { name: "Phát triển nhận thức", keywords: ["phát triển nhận thức sơ sinh", "thị giác trẻ sơ sinh", "thính giác trẻ sơ sinh"] },
      { name: "Phát triển vận động", keywords: ["phát triển vận động sơ sinh", "tummy time", "nằm sấp", "lẫy", "lật"] },
      { name: "An toàn cho trẻ sơ sinh", keywords: ["an toàn cho trẻ sơ sinh", "hội chứng sids", "đột tử khi ngủ", "chống ngạt cho bé"] }
    ]
  },
  {
    id: 3,
    name: "TRẺ NHỎ",
    keywords: ["trẻ nhỏ", "bé lớn", "bé 1 tuổi", "bé 2 tuổi", "bé 3 tuổi", "trẻ em", "mầm non"],
    subtopics: [
      { name: "Chăm sóc trẻ", keywords: ["chăm sóc trẻ nhỏ", "kinh nghiệm nuôi con"] },
      { name: "Dinh dưỡng", keywords: ["dinh dưỡng cho trẻ nhỏ", "chế độ dinh dưỡng của bé"] },
      { name: "Ăn dặm", keywords: ["ăn dặm", "ăn dặm kiểu nhật", "ăn dặm blw", "ăn dặm tự chỉ huy", "cháo ăn dặm", "bột ăn dặm"] },
      { name: "Sữa", keywords: ["sữa cho bé", "sữa chua", "váng sữa", "sữa hạt cho bé"] },
      { name: "Biếng ăn", keywords: ["biếng ăn", "trẻ biếng ăn", "lười ăn", "cách trị biếng ăn", "siro ăn ngon"] },
      { name: "Tăng trưởng", keywords: ["tăng trưởng ở trẻ", "bé chậm tăng cân", "bé suy dinh dưỡng"] },
      { name: "Chiều cao & cân nặng", keywords: ["chiều cao cân nặng chuẩn", "bảng chiều cao cân nặng", "tăng chiều cao cho bé"] },
      { name: "Giấc ngủ", keywords: ["giấc ngủ trẻ nhỏ", "luyện ngủ cho trẻ"] },
      { name: "Phát triển thể chất", keywords: ["phát triển thể chất", "tăng cường thể lực cho bé"] },
      { name: "Phát triển vận động", keywords: ["bé tập đi", "bé tập bò", "vận động tinh", "vận động thô"] },
      { name: "Phát triển ngôn ngữ", keywords: ["phát triển ngôn ngữ", "bé tập nói", "trẻ chậm nói", "dạy bé nói"] },
      { name: "Phát triển nhận thức", keywords: ["phát triển nhận thức", "phát triển trí tuệ", "trò chơi thông minh"] },
      { name: "Sức khỏe", keywords: ["sức khỏe trẻ nhỏ", "tăng sức đề kháng cho bé"] },
      { name: "Bệnh thường gặp", keywords: ["tay chân miệng", "sốt xuất huyết", "viêm phế quản", "viêm tai giữa", "viêm họng ở trẻ"] },
      { name: "Vệ sinh cá nhân", keywords: ["vệ sinh cá nhân cho bé", "rửa tay", "tắm cho trẻ nhỏ"] },
      { name: "Chăm sóc răng miệng", keywords: ["chăm sóc răng miệng cho bé", "sâu răng ở trẻ", "kem đánh răng cho bé", "bàn chải cho bé"] },
      { name: "Tâm lý & hành vi", keywords: ["khủng hoảng tuổi lên 2", "khủng hoảng tuổi lên 3", "bé ăn vạ", "tâm lý trẻ"] },
      { name: "Nuôi dạy trẻ", keywords: ["nuôi dạy trẻ", "phương pháp giáo dục", "kỷ luật không nước mắt"] },
      { name: "An toàn cho trẻ", keywords: ["an toàn cho trẻ nhỏ", "phòng tránh tai nạn thương tích"] }
    ]
  },
  {
    id: 4,
    name: "MẸ SAU SINH",
    keywords: ["mẹ sau sinh", "phụ nữ sau sinh", "sau khi sinh", "gái đẻ", "sau sinh con"],
    subtopics: [
      { name: "Chăm sóc mẹ sau sinh", keywords: ["chăm sóc mẹ sau sinh", "chăm sóc sản phụ"] },
      { name: "Phục hồi sau sinh", keywords: ["phục hồi sau sinh", "hồi phục sức khỏe sau sinh"] },
      { name: "Phục hồi sau sinh thường", keywords: ["phục hồi sau sinh thường", "chăm sóc sau sinh thường"] },
      { name: "Phục hồi sau sinh mổ", keywords: ["phục hồi sau sinh mổ", "chăm sóc sau mổ đẻ"] },
      { name: "Sản dịch", keywords: ["sản dịch", "sản dịch sau sinh", "hết sản dịch", "bế sản dịch", "mùi sản dịch"] },
      { name: "Chăm sóc vết mổ", keywords: ["chăm sóc vết mổ", "vết khâu mổ đẻ", "nhiễm trùng vết mổ", "kem sẹo sau mổ"] },
      { name: "Chăm sóc vùng kín", keywords: ["chăm sóc vùng kín sau sinh", "khâu tầng sinh môn", "xông vùng kín", "ngâm phụ khoa sau sinh"] },
      { name: "Dinh dưỡng sau sinh", keywords: ["dinh dưỡng sau sinh", "mẹ sau sinh nên ăn gì", "mẹ cho con bú kiêng ăn gì"] },
      { name: "Thực đơn sau sinh", keywords: ["thực đơn sau sinh", "món ăn cho mẹ sau sinh", "cơm ở cữ"] },
      { name: "Lợi sữa", keywords: ["lợi sữa", "món ăn lợi sữa", "thực phẩm lợi sữa", "chè vằng", "kích sữa"] },
      { name: "Cho con bú", keywords: ["cho con bú", "khớp ngậm đúng", "nuôi con bằng sữa mẹ"] },
      { name: "Tắc tia sữa", keywords: ["tắc tia sữa", "tắc sữa", "cương sữa", "áp xe vú"] },
      { name: "Thông tắc tia sữa", keywords: ["thông tắc tia sữa", "chữa tắc tia sữa", "cách thông tia sữa", "máy thông tia sữa"] },
      { name: "Hút sữa", keywords: ["hút sữa", "vắt sữa", "máy hút sữa", "lịch hút sữa"] },
      { name: "Giảm cân sau sinh", keywords: ["giảm cân sau sinh", "cách giảm cân sau sinh", "thực đơn giảm cân cho mẹ cho con bú"] },
      { name: "Giảm eo sau sinh", keywords: ["giảm eo sau sinh", "quấn muối giảm eo", "nịt bụng sau sinh"] },
      { name: "Giảm mỡ bụng sau sinh", keywords: ["giảm mỡ bụng sau sinh", "rượu gừng nghệ hạ thổ", "tan mỡ bụng sau sinh"] },
      { name: "Massage sau sinh", keywords: ["massage sau sinh", "mát xa sau sinh", "xoa bóp sau sinh"] },
      { name: "Chăm sóc da sau sinh", keywords: ["chăm sóc da sau sinh", "nám sau sinh", "rạn da sau sinh", "dưỡng da sau sinh"] },
      { name: "Rụng tóc sau sinh", keywords: ["rụng tóc sau sinh", "chữa rụng tóc sau sinh", "dầu gội ngăn rụng tóc sau sinh"] },
      { name: "Giấc ngủ sau sinh", keywords: ["giấc ngủ sau sinh", "mất ngủ sau sinh"] },
      { name: "Tâm lý sau sinh", keywords: ["tâm lý sau sinh", "trầm cảm sau sinh", "stress sau sinh", "baby blues"] },
      { name: "Sức khỏe sau sinh", keywords: ["sức khỏe sau sinh", "khám phụ khoa sau sinh"] },
      { name: "Sinh hoạt sau sinh", keywords: ["sinh hoạt sau sinh", "quan hệ sau sinh", "vận động sau sinh"] },
      { name: "Kiêng cữ sau sinh", keywords: ["kiêng cữ sau sinh", "kiêng gió", "kiêng nước", "khoa học kiêng cữ"] }
    ]
  },
  {
    id: 5,
    name: "Ở CỮ",
    keywords: ["ở cữ", "cữ sau sinh", "thời gian ở cữ", "bà đẻ ở cữ", "tháng ở cữ"],
    subtopics: [
      { name: "Kiến thức ở cữ", keywords: ["kiến thức ở cữ", "cẩm nang ở cữ", "ở cữ khoa học"] },
      { name: "Chăm sóc mẹ ở cữ", keywords: ["chăm sóc mẹ ở cữ", "chăm bà đẻ"] },
      { name: "Chăm sóc bé trong thời gian ở cữ", keywords: ["chăm bé trong thời gian ở cữ", "chăm bé sơ sinh ở cữ"] },
      { name: "Dinh dưỡng ở cữ", keywords: ["dinh dưỡng ở cữ", "chế độ ăn ở cữ"] },
      { name: "Thực đơn ở cữ", keywords: ["thực đơn ở cữ", "món ăn ở cữ", "cơm cữ", "bữa ăn ở cữ"] },
      { name: "Kiêng cữ", keywords: ["kiêng cữ", "kiêng cữ đúng cách", "các điều kiêng cữ"] },
      { name: "Sinh hoạt ở cữ", keywords: ["sinh hoạt ở cữ", "phòng ở cữ", "nhiệt độ phòng ở cữ"] },
      { name: "Vệ sinh & tắm gội", keywords: ["tắm gội ở cữ", "bao lâu sau sinh thì tắm", "xông tắm ở cữ", "nước tắm lá dao đỏ"] },
      { name: "Massage ở cữ", keywords: ["massage ở cữ", "chăm sóc body ở cữ"] },
      { name: "Phục hồi cơ thể", keywords: ["phục hồi cơ thể ở cữ", "hồi phục vóc dáng ở cữ"] },
      { name: "Lợi sữa", keywords: ["lợi sữa ở cữ", "kích sữa ở cữ"] },
      { name: "Nghỉ ngơi", keywords: ["nghỉ ngơi ở cữ", "thư giãn ở cữ"] },
      { name: "Người chăm mẹ sau sinh", keywords: ["người chăm mẹ sau sinh", "bà ngoại chăm đẻ", "bà nội chăm đẻ"] },
      { name: "Thuê người ở cữ", keywords: ["thuê người ở cữ", "thuê người chăm sóc sau sinh"] },
      { name: "Dịch vụ ở cữ", keywords: ["dịch vụ ở cữ", "gói dịch vụ ở cữ"] },
      { name: "Trung tâm ở cữ", keywords: ["trung tâm ở cữ", "resort ở cữ", "khách sạn ở cữ"] },
      { name: "Chi phí ở cữ", keywords: ["chi phí ở cữ", "giá dịch vụ ở cữ", "hết bao nhiêu tiền ở cữ"] }
    ]
  },
  {
    id: 6,
    name: "DINH DƯỠNG MẸ & BÉ",
    keywords: ["dinh dưỡng mẹ và bé", "thực đơn mẹ và bé", "chế độ ăn uống mẹ bé", "dinh dưỡng mẹ bé"],
    subtopics: [
      { name: "Dinh dưỡng mẹ bầu", keywords: ["dinh dưỡng mẹ bầu", "bà bầu ăn gì", "thực đơn bà bầu"] },
      { name: "Dinh dưỡng mẹ sau sinh", keywords: ["dinh dưỡng mẹ sau sinh", "mẹ sau sinh ăn gì"] },
      { name: "Dinh dưỡng trẻ sơ sinh", keywords: ["dinh dưỡng trẻ sơ sinh", "dinh dưỡng bé sơ sinh"] },
      { name: "Dinh dưỡng trẻ nhỏ", keywords: ["dinh dưỡng trẻ nhỏ", "dinh dưỡng trẻ em"] },
      { name: "Sữa mẹ", keywords: ["sữa mẹ", "dòng sữa mẹ", "bảo quản sữa mẹ"] },
      { name: "Sữa công thức", keywords: ["sữa công thức", "chọn sữa công thức"] },
      { name: "Ăn dặm", keywords: ["thực đơn ăn dặm", "món ăn dặm", "ăn dặm 6 tháng", "ăn dặm 7 tháng"] },
      { name: "Thực đơn", keywords: ["thực đơn", "món ngon mỗi ngày", "thực đơn dinh dưỡng"] },
      { name: "Vitamin & khoáng chất", keywords: ["bổ sung vitamin", "khoáng chất", "kẽm", "canxi", "vitamin d3"] },
      { name: "Thực phẩm bổ sung", keywords: ["thực phẩm bổ sung", "men vi sinh", "men tiêu hóa", "dha"] },
      { name: "Thực phẩm nên ăn", keywords: ["thực phẩm nên ăn", "thực phẩm tốt cho sức khỏe"] },
      { name: "Thực phẩm cần hạn chế", keywords: ["thực phẩm cần hạn chế", "không nên ăn gì", "kiêng ăn gì"] },
      { name: "Tăng cân", keywords: ["tăng cân cho bé", "món ăn tăng cân"] },
      { name: "Giảm cân", keywords: ["giảm cân lành mạnh", "thực đơn giảm cân"] },
      { name: "Lợi sữa", keywords: ["thực phẩm lợi sữa", "nước uống lợi sữa"] }
    ]
  },
  {
    id: 7,
    name: "CHĂM SÓC DA MẸ & BÉ",
    keywords: ["chăm sóc da mẹ và bé", "skincare cho mẹ", "làn da của bé", "da mẹ và bé"],
    subtopics: [
      { name: "Da trẻ sơ sinh", keywords: ["da trẻ sơ sinh", "đặc điểm da trẻ sơ sinh"] },
      { name: "Da trẻ nhỏ", keywords: ["da trẻ nhỏ", "chăm sóc da cho bé"] },
      { name: "Hăm tã", keywords: ["hăm tã", "kem chống hăm", "chữa hăm tã"] },
      { name: "Rôm sảy", keywords: ["rôm sảy", "mụn rôm", "trị rôm sảy"] },
      { name: "Mẩn đỏ", keywords: ["mẩn đỏ", "nổi mề đay", "dị ứng da bé"] },
      { name: "Da khô", keywords: ["da khô", "nẻ da", "kem dưỡng ẩm cho bé"] },
      { name: "Chàm", keywords: ["chàm sữa", "chàm thể tạng", "kem bôi chàm"] },
      { name: "Viêm da", keywords: ["viêm da cơ địa", "viêm da tiết bã", "cứt trâu ở trẻ sơ sinh"] },
      { name: "Chăm sóc da mẹ bầu", keywords: ["chăm sóc da mẹ bầu", "mỹ phẩm an toàn cho bà bầu"] },
      { name: "Chăm sóc da sau sinh", keywords: ["chăm sóc da sau sinh", "dưỡng trắng da sau sinh", "phục hồi da sau sinh"] },
      { name: "Rạn da", keywords: ["rạn da", "kem chống rạn", "dầu trị rạn"] },
      { name: "Mụn", keywords: ["mụn thai kỳ", "mụn sau sinh", "trị mụn cho mẹ"] },
      { name: "Nám", keywords: ["nám sau sinh", "nám thai kỳ", "tàn nhang"] },
      { name: "Khô da", keywords: ["khô da sau sinh", "cấp ẩm da"] },
      { name: "Sản phẩm chăm sóc da", keywords: ["sản phẩm chăm sóc da", "kem dưỡng da mẹ bé", "kem thảo dược"] }
    ]
  },
  {
    id: 8,
    name: "SỨC KHỎE MẸ & BÉ",
    keywords: ["sức khỏe mẹ và bé", "bệnh viện phụ sản", "y tế mẹ bé", "chữa bệnh mẹ bé"],
    subtopics: [
      { name: "Sức khỏe thai kỳ", keywords: ["sức khỏe thai kỳ", "bảo vệ thai nhi"] },
      { name: "Sức khỏe sau sinh", keywords: ["sức khỏe sau sinh", "bệnh hậu sản"] },
      { name: "Sức khỏe trẻ sơ sinh", keywords: ["sức khỏe trẻ sơ sinh", "khám sơ sinh"] },
      { name: "Sức khỏe trẻ nhỏ", keywords: ["sức khỏe trẻ nhỏ", "khám nhi"] },
      { name: "Triệu chứng", keywords: ["triệu chứng", "biểu hiện"] },
      { name: "Nguyên nhân", keywords: ["nguyên nhân", "lý do vì sao"] },
      { name: "Dấu hiệu cảnh báo", keywords: ["dấu hiệu cảnh báo", "dấu hiệu nguy hiểm"] },
      { name: "Bệnh thường gặp", keywords: ["bệnh thường gặp", "cảm cúm", "sốt", "viêm phổi"] },
      { name: "Phòng ngừa", keywords: ["phòng ngừa", "cách phòng tránh"] },
      { name: "Cách xử lý", keywords: ["cách xử lý", "cách sơ cứu", "hướng dẫn xử lý"] },
      { name: "Khi nào cần đi khám", keywords: ["khi nào cần đi khám", "khi nào đưa bé đến viện"] },
      { name: "Tiêm chủng", keywords: ["tiêm chủng", "vắc xin", "lịch tiêm phòng"] },
      { name: "Chăm sóc tại nhà", keywords: ["chăm sóc tại nhà", "điều trị tại nhà", "theo dõi tại nhà"] }
    ]
  },
  {
    id: 9,
    name: "TẮM & VỆ SINH",
    keywords: ["tắm và vệ sinh", "tắm gội cho bé", "vệ sinh trẻ", "vệ sinh mẹ bé"],
    subtopics: [
      { name: "Tắm bé", keywords: ["tắm bé", "cách tắm bé", "thao tác tắm bé"] },
      { name: "Tắm trẻ sơ sinh", keywords: ["tắm trẻ sơ sinh", "hướng dẫn tắm trẻ sơ sinh"] },
      { name: "Tắm thảo dược", keywords: ["tắm thảo dược", "nước tắm thảo dược", "lá tắm cho bé"] },
      { name: "Vệ sinh trẻ sơ sinh", keywords: ["vệ sinh trẻ sơ sinh", "vệ sinh hằng ngày cho bé"] },
      { name: "Chăm sóc rốn", keywords: ["chăm sóc rốn", "sát khuẩn rốn", "băng rốn"] },
      { name: "Tắm gội cho bé", keywords: ["tắm gội cho bé", "gội đầu cho bé"] },
      { name: "Vệ sinh tai", keywords: ["vệ sinh tai", "lau tai cho bé", "ráy tai"] },
      { name: "Vệ sinh mũi", keywords: ["vệ sinh mũi", "rửa mũi", "hút mũi", "nhỏ nước muối sinh lý"] },
      { name: "Vệ sinh mắt", keywords: ["vệ sinh mắt", "lau mắt cho bé", "ghèn mắt", "đau mắt đỏ"] },
      { name: "Chăm sóc móng", keywords: ["cắt móng tay cho bé", "chăm sóc móng"] },
      { name: "Thay tã", keywords: ["thay tã", "cách mặc bỉm", "thay bỉm cho bé"] },
      { name: "Vệ sinh vùng kín", keywords: ["vệ sinh vùng kín", "vệ sinh bộ phận sinh dục"] }
    ]
  },
  {
    id: 10,
    name: "NUÔI DẠY CON",
    keywords: ["nuôi dạy con", "dạy con", "rèn con", "giáo dục con cái"],
    subtopics: [
      { name: "Chăm sóc trẻ", keywords: ["chăm sóc trẻ", "kinh nghiệm nuôi bé"] },
      { name: "Nuôi con sơ sinh", keywords: ["nuôi con sơ sinh", "kinh nghiệm nuôi con sơ sinh"] },
      { name: "Nuôi con theo tháng tuổi", keywords: ["theo tháng tuổi", "bé 1 tháng", "bé 2 tháng", "bé 3 tháng", "bé 6 tháng"] },
      { name: "EASY", keywords: ["easy", "phương pháp easy", "nếp sinh hoạt easy", "easy 3", "easy 4", "easy 2-3-4"] },
      { name: "Lịch sinh hoạt", keywords: ["lịch sinh hoạt", "nếp sinh hoạt của bé"] },
      { name: "Giấc ngủ", keywords: ["giấc ngủ", "rèn ngủ", "tự ngủ", "cũi cho bé"] },
      { name: "Ăn uống", keywords: ["ăn uống", "tập ăn", "rèn ăn"] },
      { name: "Khóc & quấy", keywords: ["khóc và quấy", "bé gắt ngủ", "bé khóc không dỗ được"] },
      { name: "Dỗ trẻ", keywords: ["dỗ trẻ", "cách dỗ bé ngủ", "ti giả", "quấn chũn"] },
      { name: "Phát triển kỹ năng", keywords: ["phát triển kỹ năng", "kỹ năng sống cho trẻ"] },
      { name: "Giáo dục sớm", keywords: ["giáo dục sớm", "montessori", "glenn doman", "shichida"] },
      { name: "Tâm lý trẻ", keywords: ["tâm lý trẻ", "hiểu tâm lý con"] },
      { name: "Hành vi trẻ", keywords: ["hành vi trẻ", "xử lý cơn giận", "hành vi bướng bỉnh"] },
      { name: "Gắn kết mẹ và bé", keywords: ["gắn kết mẹ và bé", "tình mẫu tử", "skin-to-skin", "da kề da"] }
    ]
  },
  {
    id: 11,
    name: "SẢN PHẨM MẸ & BÉ",
    keywords: ["sản phẩm mẹ và bé", "đồ dùng mẹ và bé", "đồ mẹ bé", "mua đồ cho bé"],
    subtopics: [
      { name: "Sản phẩm cho mẹ bầu", keywords: ["sản phẩm cho mẹ bầu", "váy bầu", "gối bầu"] },
      { name: "Sản phẩm cho mẹ sau sinh", keywords: ["sản phẩm cho mẹ sau sinh", "quần lót sau sinh", "áo lót cho con bú"] },
      { name: "Sản phẩm cho trẻ sơ sinh", keywords: ["sản phẩm cho trẻ sơ sinh", "đồ sơ sinh trọn gói"] },
      { name: "Mỹ phẩm mẹ & bé", keywords: ["mỹ phẩm mẹ và bé", "son dưỡng an toàn", "kem dưỡng an toàn"] },
      { name: "Chăm sóc da", keywords: ["sản phẩm chăm sóc da", "kem hăm", "dưỡng ẩm"] },
      { name: "Tắm & gội", keywords: ["tắm và gội", "sữa tắm gội 2 trong 1"] },
      { name: "Dầu gội", keywords: ["dầu gội", "dầu gội cho bé", "dầu gội bồ kết"] },
      { name: "Sữa tắm", keywords: ["sữa tắm", "sữa tắm bé", "sữa tắm thảo dược"] },
      { name: "Kem da", keywords: ["kem da", "kem bôi da", "kem nẻ"] },
      { name: "Muối tắm", keywords: ["muối tắm", "muối ngâm chân", "muối tắm thảo dược"] },
      { name: "Dầu massage", keywords: ["dầu massage", "dầu mát xa", "dầu tràm", "tinh dầu tràm"] },
      { name: "Sản phẩm vệ sinh", keywords: ["nước giặt xả cho bé", "nước rửa bình sữa"] },
      { name: "Sản phẩm dinh dưỡng", keywords: ["bột dinh dưỡng", "ngũ cốc lợi sữa"] },
      { name: "Đồ dùng sơ sinh", keywords: ["bình sữa", "núm ti", "máy tiệt trùng", "máy hâm sữa", "nôi em bé", "xe đẩy"] },
      { name: "Review sản phẩm", keywords: ["review sản phẩm", "đánh giá sản phẩm", "dùng thử"] },
      { name: "So sánh sản phẩm", keywords: ["so sánh", "nên mua loại nào"] },
      { name: "Thành phần sản phẩm", keywords: ["thành phần", "chiết xuất tự nhiên"] },
      { name: "Công dụng sản phẩm", keywords: ["công dụng", "tác dụng của sản phẩm"] },
      { name: "Cách sử dụng sản phẩm", keywords: ["hướng dẫn sử dụng", "cách dùng sản phẩm"] }
    ]
  },
  {
    id: 12,
    name: "DỊCH VỤ MẸ & BÉ",
    keywords: ["dịch vụ mẹ và bé", "dịch vụ tắm bé", "chăm sóc mẹ bé", "spa mẹ bé", "dịch vụ chăm sóc sau sinh"],
    subtopics: [
      {
        name: "Tắm bé",
        keywords: ["tắm bé", "dịch vụ tắm bé", "tắm bé sơ sinh"],
        specificTopics: [
          { name: "Tắm bé tại nhà", keywords: ["tắm bé tại nhà", "dịch vụ tắm bé tại nhà", "y tá tắm bé tại nhà", "tắm bé ở nhà"] },
          { name: "Tắm bé thủy liệu", keywords: ["tắm bé thủy liệu", "baby float", "bơi thủy liệu"] }
        ]
      },
      {
        name: "Chăm sóc mẹ & bé sau sinh",
        keywords: ["chăm sóc mẹ và bé sau sinh", "chăm sóc mẹ và bé", "gói chăm sóc mẹ và bé"]
      },
      {
        name: "Chăm sóc mẹ sau sinh",
        keywords: ["chăm sóc mẹ sau sinh", "dịch vụ chăm sóc mẹ sau sinh", "spa sau sinh"]
      },
      {
        name: "Ở cữ",
        keywords: ["dịch vụ ở cữ", "chăm sóc ở cữ", "trung tâm ở cữ", "thuê người chăm ở cữ"]
      },
      {
        name: "Massage bầu",
        keywords: ["massage bầu", "mát xa bầu", "dịch vụ massage bầu", "massage cho bà bầu tại nhà", "spa cho bà bầu"]
      },
      {
        name: "Massage sau sinh",
        keywords: ["massage sau sinh", "mát xa sau sinh", "dịch vụ massage sau sinh"]
      },
      {
        name: "Thông tắc tia sữa",
        keywords: ["thông tắc tia sữa", "dịch vụ thông tắc tia sữa", "thông tia sữa tại nhà", "chữa tắc tia sữa tại nhà"]
      },
      {
        name: "Chăm sóc rốn",
        keywords: ["dịch vụ chăm sóc rốn", "thay băng rốn tại nhà", "vệ sinh rốn tại nhà"]
      },
      {
        name: "Chăm sóc da",
        keywords: ["chăm sóc da sau sinh", "dịch vụ làm đẹp sau sinh"]
      },
      {
        name: "Giảm eo sau sinh",
        keywords: ["giảm eo sau sinh", "dịch vụ giảm eo", "liệu trình giảm eo"]
      },
      {
        name: "Giảm mỡ bụng",
        keywords: ["giảm mỡ bụng", "giảm số đo vòng 2", "liệu trình giảm mỡ bụng sau sinh"]
      },
      {
        name: "Dịch vụ tại nhà",
        keywords: ["dịch vụ tại nhà", "chăm sóc tại nhà", "y tá tại nhà"]
      },
      {
        name: "Trung tâm chăm sóc mẹ & bé",
        keywords: ["trung tâm chăm sóc mẹ và bé", "viện chăm sóc mẹ bé", "spa mẹ và bé"]
      }
    ]
  }
];

export const CONTEXT_LIST: ContextDefinition[] = [
  { name: "Hướng dẫn", keywords: ["hướng dẫn", "cách làm", "làm thế nào", "các bước", "quy trình", "cách thực hiện", "bí kíp", "mẹo"] },
  { name: "Nguyên nhân", keywords: ["nguyên nhân", "lý do", "vì sao", "tại sao", "do đâu"] },
  { name: "Dấu hiệu", keywords: ["dấu hiệu", "biểu hiện", "triệu chứng", "nhận biết", "nhận diện", "cảnh báo"] },
  { name: "Cách xử lý", keywords: ["cách xử lý", "cách chữa", "khắc phục", "điều trị", "phương pháp xử lý", "sơ cứu", "phải làm sao", "làm gì khi"] },
  { name: "Phòng ngừa", keywords: ["phòng ngừa", "phòng tránh", "ngăn ngừa", "ngừa"] },
  { name: "Có nên / không nên", keywords: ["có nên", "không nên", "nên hay không", "tốt hay không", "được không"] },
  { name: "So sánh", keywords: ["so sánh", "hay hơn", "khác nhau", "phân biệt", "loại nào tốt", "vs"] },
  { name: "Review", keywords: ["review", "trải nghiệm", "chia sẻ cảm nhận", "thực tế"] },
  { name: "Đánh giá", keywords: ["đánh giá", "nhận xét", "ưu nhược điểm", "chất lượng"] },
  { name: "Kinh nghiệm", keywords: ["kinh nghiệm", "tâm sự", "lời khuyên", "bài học"] },
  { name: "Chi phí / Giá", keywords: ["chi phí", "giá bao nhiêu", "bảng giá", "giá rẻ", "giá dịch vụ", "bao nhiêu tiền", "học phí", "báo giá", "bán giá"] },
  { name: "Thành phần", keywords: ["thành phần", "chiết xuất", "chứa chất gì", "nguyên liệu"] },
  { name: "Công dụng", keywords: ["công dụng", "tác dụng", "lợi ích", "tính năng"] },
  { name: "Cách sử dụng", keywords: ["cách sử dụng", "cách dùng", "liều lượng", "hướng dẫn dùng"] },
  { name: "Địa điểm", keywords: ["ở đâu", "địa chỉ", "cơ sở", "khu vực", "nơi nào", "gần đây"] },
  { name: "Dịch vụ", keywords: ["dịch vụ", "gói dịch vụ", "liệu trình", "bảng dịch vụ"] }
];

export const LOCATION_LIST: LocationDefinition[] = [
  { name: "Hà Nội", aliases: ["hà nội", "ha noi", "hn", "thủ đô"] },
  { name: "TP.HCM", aliases: ["tp.hcm", "tphcm", "tp hcm", "hồ chí minh", "ho chi minh", "sài gòn", "sai gon"] },
  { name: "Hải Phòng", aliases: ["hải phòng", "hai phong"] },
  { name: "Bắc Ninh", aliases: ["bắc ninh", "bac ninh"] },
  { name: "Quảng Ninh", aliases: ["quảng ninh", "quang ninh", "hạ long"] },
  { name: "Hưng Yên", aliases: ["hưng yên", "hung yen"] },
  { name: "Hải Dương", aliases: ["hải dương", "hai duong"] },
  { name: "Ninh Bình", aliases: ["ninh bình", "ninh binh"] },
  { name: "Nam Định", aliases: ["nam định", "nam dinh"] },
  { name: "Thái Nguyên", aliases: ["thái nguyên", "thai nguyen"] },
  { name: "Thanh Hóa", aliases: ["thanh hóa", "thanh hoa"] },
  { name: "Nghệ An", aliases: ["nghệ an", "nghe an", "vinh"] },
  { name: "Bình Dương", aliases: ["bình dương", "binh duong"] },
  { name: "Đồng Nai", aliases: ["đồng nai", "dong nai", "biên hòa"] },
  { name: "Cần Thơ", aliases: ["cần thơ", "can tho"] },
  { name: "Đà Nẵng", aliases: ["đà nẵng", "da nang"] },
  { name: "Huế", aliases: ["huế", "thừa thiên huế"] },
  { name: "Vũng Tàu", aliases: ["vũng tàu", "bà rịa vũng tàu"] },
  { name: "Khánh Hòa", aliases: ["khánh hòa", "nha trang"] }
];
