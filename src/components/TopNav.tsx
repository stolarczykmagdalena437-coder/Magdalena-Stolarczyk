import React from 'react';

interface TopNavProps {
  brandName: string;
  isOwner: boolean;
  isLoggedIn: boolean;
  onOpenAdminModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  brandName,
  isOwner,
  isLoggedIn,
  onOpenAdminModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#trang-chu"
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          {brandName}
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <a
            href="#danh-sach-phong"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Danh sách phòng
          </a>
          <a
            href="#ban-do-vi-tri"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Bản đồ vị trí
          </a>
          <a
            href="#uoc-tinh-chi-phi"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Ước tính chi phí
          </a>
          <a
            href="#lien-he-tu-van"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Liên hệ tư vấn
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenAdminModal}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {isOwner
              ? 'Bảng quản trị'
              : isLoggedIn
                ? 'Tài khoản'
                : 'Quản trị viên'}
          </button>
        </div>
      </div>
    </header>
  );
};
