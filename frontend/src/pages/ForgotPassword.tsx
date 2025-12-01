import { Link } from "react-router-dom";
import { AlertCircle, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Quên mật khẩu</h1>
            <p className="mt-2 text-sm text-gray-600">Yêu cầu đặt lại mật khẩu</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  Làm thế nào để đặt lại mật khẩu?
                </h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Để đặt lại mật khẩu, vui lòng liên hệ với <strong>chuyên gia</strong> của bạn.
                  Chuyên gia sẽ giúp bạn reset mật khẩu về mật khẩu mặc định, sau đó bạn có thể đăng nhập và đổi sang mật khẩu mới.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Thông tin cần cung cấp:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Tên đăng nhập (username) của bạn</li>
                <li>Email đã đăng ký (nếu có)</li>
                <li>Lý do cần đặt lại mật khẩu</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại trang đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

