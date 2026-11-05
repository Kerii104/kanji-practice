# Nét Kanji

Website luyện viết kanji bằng HTML, CSS và JavaScript thuần; không cần cài thư viện hay bước build.

## Các tệp chính

- `index.html`: cấu trúc giao diện, nút và biểu mẫu.
- `style.css`: phông chữ, màu sắc, bố cục và giao diện trên điện thoại.
- `app.js`: xử lý dữ liệu, luyện tập, thư viện, nhập/xuất và bảng tập viết. Các phần được đánh số bằng chú thích trong tệp.
- `kanshudo-data.js`: dữ liệu tham khảo N5 và N4. Mỗi mục có dạng `[kanji, cấp JLPT, âm Hán Việt, nghĩa, cách đọc]`.

Giữ các tệp JavaScript theo đúng thứ tự nạp ở cuối `index.html`: `kanshudo-data.js`, sau đó `app.js`.

## Chạy trên máy

Mở terminal trong thư mục này và chạy:

```bash
python3 -m http.server 3000
```

Truy cập `http://localhost:3000`. Tải lại trang sau khi sửa tệp. Thứ tự nét KanjiVG và phông chữ trực tuyến cần kết nối internet. Trên màn hình rộng, dùng nút **Thu gọn thanh bên** bên dưới menu để thu/mở sidebar; lựa chọn được ghi nhớ trên trình duyệt.

## Chỉnh sửa thường gặp

- **Chữ và nhãn trên giao diện:** tìm nội dung tương ứng trong `index.html`. Nội dung của thẻ luyện tập và từng dòng thư viện được tạo bằng JavaScript trong `renderPractice()` và `renderLibrary()` của `app.js`.
- **Màu và phông chữ:** chỉnh các biến ở đầu `style.css`, trong khối `:root`.
- **Dữ liệu kanji có sẵn:** xem `kanshudo-data.js`. Với dữ liệu cá nhân, nên dùng chức năng sửa trực tiếp trên website.

**Lưu ý:** Danh sách và tiến độ được lưu trong `localStorage` của trình duyệt. Việc sửa tệp dữ liệu mặc định không tự ghi đè danh sách đã lưu. Các khối cập nhật dữ liệu trong `app.js` chỉ chạy một lần trên mỗi trình duyệt; tránh thay đổi khóa lưu trữ hay xóa dữ liệu trình duyệt nếu chưa sao lưu. Dùng chức năng **Xuất dữ liệu** trước khi thử thay đổi lớn.

## Nguồn dữ liệu

- Phân loại N5/N4 tham khảo: [Kanshudo](https://www.kanshudo.com/collections/jlpt_kanji); đây không phải danh sách JLPT chính thức.
- Âm Hán Việt và nghĩa bổ sung: [Kanjiba](https://github.com/thuandaohong/kanjikana), dựa trên KANJIDIC2; nghĩa tiếng Việt có hỗ trợ AI. Dữ liệu KANJIDIC2 theo CC BY-SA 4.0.
- Thứ tự nét: [KanjiVG](https://kanjivg.tagaini.net/).
