# Nét Kanji

Website luyện viết kanji bằng HTML, CSS và JavaScript thuần; không cần cài thư viện hay bước build.

## Các tệp chính

- `index.html`: cấu trúc giao diện, nút và biểu mẫu.
- `style.css`: phông chữ, màu sắc, bố cục và giao diện trên điện thoại.
- `app.js`: xử lý dữ liệu, luyện tập, thư viện, nhập/xuất và bảng tập viết. Các phần được đánh số bằng chú thích trong tệp.
- `kanshudo-data.js`: dữ liệu tham khảo N5 đến N1. Mỗi mục có dạng `[kanji, cấp JLPT, âm Hán Việt, nghĩa, cách đọc]`.

Giữ các tệp JavaScript theo đúng thứ tự nạp ở cuối `index.html`: `kanshudo-data.js`, sau đó `app.js`.

## Chạy trên máy

Mở terminal trong thư mục này và chạy:

```bash
python3 -m http.server 3000
```

Truy cập `http://localhost:3000`. Tải lại trang sau khi sửa tệp. Thứ tự nét KanjiVG và phông chữ trực tuyến cần kết nối internet. Trên màn hình rộng, dùng nút **Thu gọn thanh bên** bên dưới menu để thu/mở sidebar; lựa chọn được ghi nhớ trên trình duyệt.

Trong thẻ luyện tập, **Đã viết được** chỉ hiện đáp án; chữ chỉ chuyển sang danh sách đã học khi bấm **Thêm vào danh sách đã học**. Nút **Chữ khác** nằm ngay cạnh bảng tập viết.

## Chỉnh sửa thường gặp

- **Chữ và nhãn trên giao diện:** tìm nội dung tương ứng trong `index.html`. Nội dung của thẻ luyện tập và từng dòng thư viện được tạo bằng JavaScript trong `renderPractice()` và `renderLibrary()` của `app.js`.
- **Màu và phông chữ:** chỉnh các biến ở đầu `style.css`, trong khối `:root`.
- **Dữ liệu kanji có sẵn:** xem `kanshudo-data.js`. Với dữ liệu cá nhân, nên dùng chức năng sửa trực tiếp trên website.

**Lưu ý:** Danh sách và tiến độ được lưu trong `localStorage` của trình duyệt. Việc sửa tệp dữ liệu mặc định không tự ghi đè danh sách đã lưu. Các khối cập nhật dữ liệu trong `app.js` chỉ chạy một lần trên mỗi trình duyệt; tránh thay đổi khóa lưu trữ hay xóa dữ liệu trình duyệt nếu chưa sao lưu. Dùng chức năng **Xuất dữ liệu** trước khi thử thay đổi lớn.

## Nguồn dữ liệu

- Phân loại N5–N1 tham khảo: [Kanshudo](https://www.kanshudo.com/collections/jlpt_kanji); đây không phải danh sách JLPT chính thức.
- Âm Hán Việt và nghĩa bổ sung: [Kanjiba](https://github.com/thuandaohong/kanjikana), dựa trên KANJIDIC2; nghĩa tiếng Việt có hỗ trợ AI. Dữ liệu KANJIDIC2 theo CC BY-SA 4.0.
- Thứ tự nét: [KanjiVG](https://kanjivg.tagaini.net/).
- Hai chữ N1 叱 và 剥 được bổ sung theo [Kanji Jitenon](https://kanji.jitenon.jp/kanjie/2019), [Kanjipedia](https://www.kanjipedia.jp/kanji/0005630600/) và [bảng Hán Việt Cosmos](https://tailieucosmos.com/wp-content/uploads/2018/05/2136-kanji.pdf). Một số âm như 芸, 県, 条, 択 được đối chiếu với [danh sách kanji](https://st.quantrimang.com/photos/pdf/2019/02/14/2000-tu-kanji-thuong-dung.pdf).

## Luyện tập và an toàn dữ liệu

- Thư viện chia trang và tối ưu tìm kiếm không dấu; sau khi nhập, kết quả cập nhật sau một khoảng nghỉ ngắn. Hình nét viết đã tải thành công được lưu tạm trong phiên để xem lại nhanh hơn, tối đa 100 chữ.

- **Chế độ khó** mặc định tắt, ẩn N2–N1 khỏi luyện tập và các thống kê tổng quan; thư viện vẫn luôn hiển thị toàn bộ. Khi bật, hãy chọn N2 và/hoặc N1 trong bộ lọc cấp độ. Thiết lập được lưu trong trình duyệt; tắt chế độ khó sẽ bỏ chọn hai cấp này.
- **Hành trình ghi nhớ** đếm chữ đã thuộc trên tổng số chữ thuộc các cấp đang chọn, bất kể chế độ luyện. Chuyển chữ hoặc thêm vào danh sách đang học không làm thay đổi tiến độ; đánh dấu đã thuộc hoặc học lại sẽ cập nhật tiến độ.

- Sau khi xem đáp án, chọn **Thêm vào danh sách đang học** để lưu chữ vào một nhóm riêng. Chọn chế độ **Danh sách đang học** để luyện ngẫu nhiên nhóm đó; chế độ **Tất cả chữ chưa thuộc** vẫn gồm cả các chữ đã chọn. Có thể thêm, bỏ và lọc nhóm trong thư viện. Khi đánh dấu đã học, chữ tự rời nhóm. Nhóm được lưu trên trình duyệt và trong tệp xuất JSON; tệp cũ chưa có thông tin nhóm sẽ nhập với nhóm trống.
- Chọn **Ôn chữ đã học** để luyện ngẫu nhiên các chữ đã đánh dấu, không tự thay đổi tiến độ. Bộ lọc cấp độ vẫn áp dụng.
- Chữ đã xóa được giữ trong **Đã xóa gần đây** của trình duyệt đến khi khôi phục hoặc xóa vĩnh viễn. Xuất JSON hiện chỉ sao lưu danh sách đang có, không bao gồm các chữ trong mục đã xóa; hãy khôi phục chữ cần sao lưu trước khi xuất.
- Dữ liệu vẫn nằm trên một trình duyệt, không tự đồng bộ giữa thiết bị. Nên xuất JSON thường xuyên. Khi có nhiều tab cùng mở, ứng dụng sẽ cảnh báo thay đổi và ngăn lưu đè dữ liệu cũ.
- Nhập JSON: **Gộp** chỉ thêm các chữ chưa có; **Thay thế** dùng danh sách trong tệp. Tệp rỗng, trùng chữ hay mục không hợp lệ sẽ bị từ chối.
- Âm Hán Việt quá dài được rút gọn khi hiển thị; dữ liệu đầy đủ vẫn nằm trong mục **Sửa**. Nguồn dữ liệu có thể chứa biến âm ít gặp hoặc nghĩa chưa hoàn hảo, nên đối chiếu từ điển khi cần.
- Sau mỗi lần chỉnh sửa và triển khai, tăng số phiên bản `?v=...` trên đường dẫn CSS/JS trong `index.html` để giảm việc dùng tệp cũ từ bộ nhớ đệm. Phiên bản hóa tệp không xóa dữ liệu người dùng.

Bộ dữ liệu được đối chiếu với danh sách Kanshudo; cách đọc Nhật mới được kiểm tra theo KANJIDIC2 (một số chữ có nhiều cách đọc, không nhất thiết được liệt kê đầy đủ). Nghĩa tiếng Việt được đối chiếu với nguồn Kanjiba, nhưng chưa được xác minh độc lập toàn bộ; âm Hán Việt và nghĩa có thể thay đổi theo ngữ cảnh. Một số âm đã được đối chiếu thêm với [Từ điển Hán Nôm](https://hvdic.thivien.net/), [Nhật ngữ](https://trungtamnhatngu.edu.vn/blog/chinh-phuc-ki-thi-jlpt-voi-danh-sach-kanji-n4-1242/) và [Cosmos](https://tailieucosmos.com/wp-content/uploads/2018/05/2136-kanji.pdf).
