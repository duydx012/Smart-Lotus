"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import {
  smartLotusApi,
  type ClassroomFeedPost,
  type ClassroomMaterialItem,
  type Role,
} from "@/lib/api";

type Props = {
  classroomId: string | number;
  classroomName: string;
  classroomLabel: string;
  subject?: string;
  teacherName?: string;
  currentRole: Role;
  onBack?: () => void;
  onToast: (msg: string) => void;
  initialPostId?: number | null;
};

export default function ClassroomFeedView({
  classroomId,
  classroomName,
  classroomLabel,
  subject = "Toán",
  teacherName,
  currentRole,
  onBack,
  onToast,
  initialPostId,
}: Props) {
  const [activeTab, setActiveTab] = useState<"feed" | "materials">("feed");
  const [posts, setPosts] = useState<ClassroomFeedPost[]>([]);
  const [materials, setMaterials] = useState<ClassroomMaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // State tạo bài viết mới
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState<string>(currentRole === "teacher" ? "announcement" : "qa");
  const [postAttachmentUrl, setPostAttachmentUrl] = useState("");
  const [postAttachmentName, setPostAttachmentName] = useState("");
  const [postPinned, setPostPinned] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);

  // State bình luận
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<number | null>(null);

  // State thêm tài liệu (dành cho giáo viên)
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matDescription, setMatDescription] = useState("");
  const [matCategory, setMatCategory] = useState("document");
  const [matFileUrl, setMatFileUrl] = useState("");
  const [matFileName, setMatFileName] = useState("");
  const [matFileSize, setMatFileSize] = useState("1.5 MB");
  const [submittingMaterial, setSubmittingMaterial] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      smartLotusApi.getClassroomFeed(classroomId).catch(() => ({ posts: [] })),
      smartLotusApi.getClassroomMaterials(classroomId).catch(() => ({ materials: [] })),
    ])
      .then(([feedData, matData]) => {
        if (!active) return;
        setPosts(feedData.posts || []);
        setMaterials(matData.materials || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [classroomId]);

  // Cuộn tới bài viết được chỉ định từ thông báo (nếu có)
  useEffect(() => {
    if (initialPostId && !loading) {
      setTimeout(() => {
        const el = document.getElementById(`post-${initialPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.style.boxShadow = "0 0 0 3px #8b5cf6, 0 10px 30px rgba(139, 92, 246, 0.25)";
          setTimeout(() => {
            el.style.boxShadow = "";
          }, 3000);
        }
      }, 300);
    }
  }, [initialPostId, loading]);

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!postContent.trim()) {
      onToast("Vui lòng nhập nội dung bài viết");
      return;
    }

    setSubmittingPost(true);
    try {
      const res = await smartLotusApi.createClassroomPost(classroomId, {
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
        category: postCategory,
        attachmentUrl: postAttachmentUrl.trim() || undefined,
        attachmentName: postAttachmentName.trim() || undefined,
        isPinned: postPinned,
      });

      onToast(res.message || "Đã đăng bài viết thành công!");
      setPosts((prev) => [res.post, ...prev]);
      setPostTitle("");
      setPostContent("");
      setPostAttachmentUrl("");
      setPostAttachmentName("");
      setPostPinned(false);
      setShowPostComposer(false);
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Không thể đăng bài viết");
    } finally {
      setSubmittingPost(false);
    }
  }

  async function handleSendComment(postId: number) {
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;

    setSubmittingCommentId(postId);
    try {
      const res = await smartLotusApi.createClassroomComment(classroomId, postId, text);
      onToast(res.message || "Đã gửi bình luận!");
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...p.comments, res.comment] }
            : p
        )
      );
      setCommentInputs((curr) => ({ ...curr, [postId]: "" }));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Không thể gửi bình luận");
    } finally {
      setSubmittingCommentId(null);
    }
  }

  async function handleLike(postId: number) {
    try {
      const res = await smartLotusApi.likeClassroomPost(classroomId, postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likesCount: res.likesCount } : p))
      );
    } catch {
      // Bỏ qua lỗi like
    }
  }

  async function handleCreateMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!matTitle.trim()) {
      onToast("Vui lòng nhập tiêu đề tài liệu");
      return;
    }

    setSubmittingMaterial(true);
    try {
      const res = await smartLotusApi.createClassroomMaterial(classroomId, {
        title: matTitle.trim(),
        description: matDescription.trim() || undefined,
        category: matCategory,
        fileUrl: matFileUrl.trim() || undefined,
        fileName: matFileName.trim() || undefined,
        fileSize: matFileSize.trim() || "1.2 MB",
        isExclusive: true,
      });

      onToast(res.message || "Đã đăng tài liệu độc quyền mới!");
      setMaterials((prev) => [res.material, ...prev]);
      setMatTitle("");
      setMatDescription("");
      setMatFileUrl("");
      setMatFileName("");
      setShowMaterialModal(false);
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Không thể đăng tài liệu");
    } finally {
      setSubmittingMaterial(false);
    }
  }

  async function handleDeleteMaterial(materialId: number) {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này không?")) return;
    try {
      await smartLotusApi.deleteClassroomMaterial(classroomId, materialId);
      onToast("Đã xóa tài liệu");
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Không thể xóa tài liệu");
    }
  }

  const filteredPosts = posts.filter((p) => {
    if (filterCategory === "all") return true;
    return p.category === filterCategory;
  });

  return (
    <div className="view-stack classroom-feed-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Banner đầu lớp học */}
      <section
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
          borderRadius: "20px",
          padding: "24px 28px",
          color: "#ffffff",
          boxShadow: "0 10px 28px rgba(124, 58, 237, 0.25)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#ffffff",
                padding: "6px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 750,
                cursor: "pointer",
                marginBottom: "14px",
                backdropFilter: "blur(6px)",
              }}
            >
              ← Quay lại danh sách lớp
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span
                  style={{
                    background: "rgba(255,255,255,0.22)",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  🌸 LỚP HỌC THÊM {subject}
                </span>
                <span style={{ fontSize: "12px", opacity: 0.9 }}>Mã lớp: {classroomLabel}</span>
              </div>
              <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                {classroomName}
              </h1>
              {teacherName && (
                <p style={{ margin: "6px 0 0", fontSize: "13px", opacity: 0.92, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>👨‍🏫 Phụ trách: <strong>{teacherName}</strong></span>
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.15)",
                  padding: "10px 16px",
                  borderRadius: "14px",
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div style={{ fontSize: "18px", fontWeight: 800 }}>{posts.length}</div>
                <div style={{ fontSize: "11px", opacity: 0.85 }}>Bài trên bảng tin</div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.15)",
                  padding: "10px 16px",
                  borderRadius: "14px",
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div style={{ fontSize: "18px", fontWeight: 800 }}>{materials.length}</div>
                <div style={{ fontSize: "11px", opacity: 0.85 }}>Tài liệu độc quyền</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs chuyển đổi giữa Bảng tin và Kho tài liệu */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "2px solid #ede9fe",
          paddingBottom: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              border: activeTab === "feed" ? "1.5px solid #8b5cf6" : "1.5px solid transparent",
              background: activeTab === "feed" ? "#8b5cf6" : "#ffffff",
              color: activeTab === "feed" ? "#ffffff" : "#6b7280",
              boxShadow: activeTab === "feed" ? "0 4px 12px rgba(139, 92, 246, 0.25)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Icon name="sparkles" size={15} />
            <span>Bảng tin & Hỏi đáp ({posts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              border: activeTab === "materials" ? "1.5px solid #8b5cf6" : "1.5px solid transparent",
              background: activeTab === "materials" ? "#8b5cf6" : "#ffffff",
              color: activeTab === "materials" ? "#ffffff" : "#6b7280",
              boxShadow: activeTab === "materials" ? "0 4px 12px rgba(139, 92, 246, 0.25)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Icon name="book" size={15} />
            <span>Kho tài liệu độc quyền ({materials.length})</span>
          </button>
        </div>

        {/* Nút hành động nhanh */}
        {activeTab === "feed" ? (
          <button
            type="button"
            onClick={() => setShowPostComposer((prev) => !prev)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: showPostComposer ? "#f3e8ff" : "#ffffff",
              border: "1.5px solid #c084fc",
              color: "#7c3aed",
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: 750,
              cursor: "pointer",
            }}
          >
            <Icon name="plus" size={14} />
            <span>{showPostComposer ? "Đóng hộp soạn" : currentRole === "teacher" ? "+ Đăng thông báo mới" : "+ Đặt câu hỏi / Hỏi bài"}</span>
          </button>
        ) : currentRole === "teacher" || currentRole === "admin" ? (
          <button
            type="button"
            onClick={() => setShowMaterialModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              color: "#ffffff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: 750,
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(124, 58, 237, 0.25)",
            }}
          >
            <Icon name="plus" size={14} />
            <span>+ Đăng tài liệu mới</span>
          </button>
        ) : null}
      </div>

      {/* ======================= TAB 1: BẢNG TIN ======================= */}
      {activeTab === "feed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Hộp soạn bài viết */}
          {showPostComposer && (
            <form
              onSubmit={handleCreatePost}
              style={{
                background: "#faf5ff",
                border: "2px solid #c084fc",
                borderRadius: "16px",
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 6px 18px rgba(124, 58, 237, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <strong style={{ fontSize: "14px", color: "#581c87" }}>
                  {currentRole === "teacher" ? "📢 Đăng thông báo / Thử thách cho lớp" : "❓ Đặt câu hỏi cho Thầy/Cô và các bạn"}
                </strong>

                {/* Chọn danh mục bài đăng */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {[
                    { id: "announcement", label: "📢 Thông báo" },
                    { id: "challenge", label: "🎯 Thử thách tuần" },
                    { id: "qa", label: "❓ Hỏi bài" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPostCategory(cat.id)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: 750,
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: postCategory === cat.id ? "1.5px solid #7c3aed" : "1px solid #ddd6fe",
                        background: postCategory === cat.id ? "#7c3aed" : "#ffffff",
                        color: postCategory === cat.id ? "#ffffff" : "#6b21a8",
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Tiêu đề bài viết (không bắt buộc)..."
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1.5px solid #d8b4fe",
                  fontSize: "13px",
                  outline: "none",
                  background: "#ffffff",
                }}
              />

              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder={
                  currentRole === "teacher"
                    ? "Nhập lời dặn dò, lưu ý ôn tập hoặc câu hỏi thử thách tuần này cho cả lớp..."
                    : "Em chưa hiểu chỗ nào hay cần thầy cô giải đáp bài toán nào thì viết vào đây nhé..."
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1.5px solid #d8b4fe",
                  fontSize: "13px",
                  outline: "none",
                  background: "#ffffff",
                  fontFamily: "inherit",
                  lineHeight: "1.5",
                  resize: "vertical",
                }}
              />

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  value={postAttachmentName}
                  onChange={(e) => setPostAttachmentName(e.target.value)}
                  placeholder="Tên tài liệu đính kèm (nếu có, VD: Đề ôn tập tuần 5.pdf)"
                  style={{
                    flex: 1,
                    minWidth: "200px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #d8b4fe",
                    fontSize: "11.5px",
                    background: "#ffffff",
                  }}
                />
                <input
                  type="text"
                  value={postAttachmentUrl}
                  onChange={(e) => setPostAttachmentUrl(e.target.value)}
                  placeholder="Link tài liệu / file (nếu có)"
                  style={{
                    flex: 1,
                    minWidth: "200px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #d8b4fe",
                    fontSize: "11.5px",
                    background: "#ffffff",
                  }}
                />
              </div>

              {currentRole === "teacher" && (
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6d28d9", cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="checkbox"
                    checked={postPinned}
                    onChange={(e) => setPostPinned(e.target.checked)}
                    style={{ accentColor: "#7c3aed" }}
                  />
                  <span>📌 Ghim bài viết này lên đầu bảng tin</span>
                </label>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setShowPostComposer(false)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #d1d5db",
                    color: "#4b5563",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                    border: "none",
                    color: "#ffffff",
                    padding: "6px 18px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 750,
                    cursor: submittingPost ? "wait" : "pointer",
                    boxShadow: "0 2px 6px rgba(124, 58, 237, 0.25)",
                  }}
                >
                  {submittingPost ? "Đang đăng..." : "🚀 Đăng bài ngay"}
                </button>
              </div>
            </form>
          )}

          {/* Bộ lọc danh mục */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 700 }}>Lọc theo:</span>
            {[
              { id: "all", label: "Tất cả" },
              { id: "announcement", label: "📢 Thông báo" },
              { id: "challenge", label: "🎯 Thử thách tuần" },
              { id: "qa", label: "❓ Hỏi bài & Trao đổi" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterCategory(f.id)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "11.5px",
                  fontWeight: 750,
                  cursor: "pointer",
                  border: filterCategory === f.id ? "1.5px solid #8b5cf6" : "1px solid #e5e7eb",
                  background: filterCategory === f.id ? "#ede9fe" : "#ffffff",
                  color: filterCategory === f.id ? "#6d28d9" : "#4b5563",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Danh sách bài viết */}
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#7c3aed", fontWeight: 700 }}>
              <Icon name="sparkles" size={24} />
              <p style={{ marginTop: "10px" }}>Đang tải bảng tin lớp học...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div
              style={{
                background: "#faf5ff",
                border: "1.5px dashed #d8b4fe",
                borderRadius: "16px",
                padding: "36px 20px",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              <span style={{ fontSize: "32px" }}>📝</span>
              <h4 style={{ margin: "10px 0 4px", color: "#581c87", fontSize: "15px" }}>Chưa có bài viết nào</h4>
              <p style={{ fontSize: "12.5px", margin: 0 }}>
                {currentRole === "teacher"
                  ? "Hãy đăng thông báo đầu tiên hoặc bài toán thử thách để chào mừng các em học sinh nhé!"
                  : "Bạn có thể bấm '+ Đặt câu hỏi' ở trên để hỏi thầy cô bất kỳ bài tập nào!"}
              </p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <article
                key={post.id}
                id={`post-${post.id}`}
                style={{
                  background: "#ffffff",
                  border: post.isPinned ? "2px solid #c084fc" : "1.5px solid #ede9fe",
                  borderRadius: "16px",
                  padding: "18px 20px",
                  boxShadow: post.isPinned
                    ? "0 4px 16px rgba(124, 58, 237, 0.12)"
                    : "0 2px 8px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  transition: "all 0.3s ease",
                }}
              >
                {/* Header bài viết: Tác giả, nhãn danh mục, ghim */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {post.authorAvatarUrl ? (
                      <img
                        src={post.authorAvatarUrl}
                        alt={post.authorName}
                        style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: post.authorRole === "teacher" ? "#7c3aed" : "#3b82f6",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "14px",
                        }}
                      >
                        {post.authorAvatar || post.authorName.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ fontSize: "13.5px", color: "#1f2937" }}>{post.authorName}</strong>
                        {post.authorRole === "teacher" && (
                          <span
                            style={{
                              background: "#f3e8ff",
                              color: "#7c3aed",
                              fontSize: "10px",
                              fontWeight: 800,
                              padding: "1px 6px",
                              borderRadius: "6px",
                            }}
                          >
                            Thầy / Cô
                          </span>
                        )}
                      </div>
                      <time style={{ fontSize: "11px", color: "#9ca3af" }}>
                        {new Intl.DateTimeFormat("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        }).format(new Date(post.createdAt))}
                      </time>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {post.isPinned && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: "#ede9fe",
                          color: "#6d28d9",
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        📌 Đã ghim
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 750,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background:
                          post.category === "challenge"
                            ? "#fef3c7"
                            : post.category === "qa"
                            ? "#e0e7ff"
                            : "#f3e8ff",
                        color:
                          post.category === "challenge"
                            ? "#b45309"
                            : post.category === "qa"
                            ? "#4338ca"
                            : "#6d28d9",
                      }}
                    >
                      {post.category === "challenge"
                        ? "🎯 Thử thách"
                        : post.category === "qa"
                        ? "❓ Hỏi bài"
                        : "📢 Thông báo"}
                    </span>
                  </div>
                </div>

                {/* Tiêu đề & Nội dung bài viết */}
                {post.title && (
                  <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#1e1b4b", margin: 0 }}>
                    {post.title}
                  </h3>
                )}

                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: "1.6",
                    color: "#374151",
                    whiteSpace: "pre-line",
                  }}
                >
                  {post.content}
                </div>

                {/* Đính kèm tài liệu (nếu có) */}
                {post.attachmentName && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: "#f5f3ff",
                      border: "1px solid #ddd6fe",
                      fontSize: "12px",
                      color: "#6d28d9",
                      width: "fit-content",
                    }}
                  >
                    <span>📎</span>
                    <strong>{post.attachmentName}</strong>
                    {post.attachmentUrl && (
                      <a
                        href={post.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#7c3aed", fontWeight: 750, marginLeft: "4px" }}
                      >
                        [Xem / Mở file]
                      </a>
                    )}
                  </div>
                )}

                {/* Thanh tương tác: Thả tim & Đếm bình luận */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    paddingTop: "10px",
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void handleLike(post.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      color: "#e11d48",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 750,
                      cursor: "pointer",
                      transition: "transform 0.1s ease",
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <span>🌸</span>
                    <span>{post.likesCount || 0} Yêu thích</span>
                  </button>

                  <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>💬</span>
                    <span>{post.comments.length} bình luận / phản hồi</span>
                  </div>
                </div>

                {/* Danh sách bình luận */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "2px" }}>
                  {post.comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        display: "flex",
                        gap: "8px",
                        background: comment.authorRole === "teacher" ? "#faf5ff" : "#f9fafb",
                        border: comment.authorRole === "teacher" ? "1px solid #e9d5ff" : "1px solid #f3f4f6",
                        padding: "8px 12px",
                        borderRadius: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          background: comment.authorRole === "teacher" ? "#7c3aed" : "#60a5fa",
                          color: "#ffffff",
                          fontSize: "10px",
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {comment.authorAvatar || comment.authorName.slice(0, 2).toUpperCase()}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <strong style={{ fontSize: "12px", color: "#1f2937" }}>{comment.authorName}</strong>
                          {comment.authorRole === "teacher" && (
                            <span style={{ fontSize: "9.5px", background: "#f3e8ff", color: "#7c3aed", padding: "1px 5px", borderRadius: "4px", fontWeight: 800 }}>
                              Thầy / Cô
                            </span>
                          )}
                          <time style={{ fontSize: "10.5px", color: "#9ca3af", marginLeft: "auto" }}>
                            {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(comment.createdAt))}
                          </time>
                        </div>
                        <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#374151", lineHeight: 1.4 }}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Ô nhập bình luận */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <input
                      type="text"
                      value={commentInputs[post.id] || ""}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendComment(post.id);
                        }
                      }}
                      placeholder={
                        currentRole === "teacher"
                          ? "Phản hồi câu hỏi hoặc động viên học sinh..."
                          : "Viết bình luận, trả lời câu hỏi của thầy cô (Thầy/Cô sẽ nhận thông báo)..."
                      }
                      style={{
                        flex: 1,
                        padding: "7px 12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "12px",
                        outline: "none",
                        background: "#ffffff",
                      }}
                    />
                    <button
                      type="button"
                      disabled={submittingCommentId === post.id || !(commentInputs[post.id] || "").trim()}
                      onClick={() => void handleSendComment(post.id)}
                      style={{
                        background: "#7c3aed",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0 14px",
                        fontSize: "12px",
                        fontWeight: 750,
                        cursor: submittingCommentId === post.id ? "wait" : "pointer",
                        opacity: !(commentInputs[post.id] || "").trim() ? 0.6 : 1,
                      }}
                    >
                      {submittingCommentId === post.id ? "..." : "Gửi"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* ======================= TAB 2: KHO TÀI LIỆU ĐỘC QUYỀN ======================= */}
      {activeTab === "materials" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)",
              border: "1.5px solid #fde047",
              borderRadius: "14px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "12.5px",
              color: "#854d0e",
            }}
          >
            <span style={{ fontSize: "20px" }}>🔒</span>
            <div>
              <strong>Kho học liệu độc quyền chỉ dành riêng cho thành viên lớp học thêm {classroomName}.</strong>
              <p style={{ margin: "2px 0 0", color: "#a16207" }}>
                Các bộ đề ôn thi, mẹo tính nhanh và bài giảng cô đọng do thầy/cô biên soạn đặc biệt.
              </p>
            </div>
          </div>

          {materials.length === 0 ? (
            <div
              style={{
                background: "#faf5ff",
                border: "1.5px dashed #d8b4fe",
                borderRadius: "16px",
                padding: "36px 20px",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              <span style={{ fontSize: "32px" }}>📚</span>
              <h4 style={{ margin: "10px 0 4px", color: "#581c87", fontSize: "15px" }}>Kho tài liệu đang được cập nhật</h4>
              <p style={{ fontSize: "12.5px", margin: 0 }}>
                {currentRole === "teacher"
                  ? "Bấm '+ Đăng tài liệu mới' ở góc phải để thêm đề cương, mẹo giải nhanh cho học sinh."
                  : "Thầy cô phụ trách sẽ sớm đăng các tài liệu ôn tập và bài tập mở rộng lên đây!"}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  style={{
                    background: "#ffffff",
                    border: "1.5px solid #e9d5ff",
                    borderRadius: "14px",
                    padding: "16px",
                    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                      <span
                        style={{
                          background:
                            mat.category === "tips"
                              ? "#ecfdf5"
                              : mat.category === "exam_prep"
                              ? "#fff7ed"
                              : mat.category === "video"
                              ? "#eff6ff"
                              : "#f5f3ff",
                          color:
                            mat.category === "tips"
                              ? "#047857"
                              : mat.category === "exam_prep"
                              ? "#c2410c"
                              : mat.category === "video"
                              ? "#1d4ed8"
                              : "#6d28d9",
                          fontSize: "10.5px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        {mat.category === "tips"
                          ? "⚡ Bí kíp tính nhanh"
                          : mat.category === "exam_prep"
                          ? "🎯 Đề cương ôn thi"
                          : mat.category === "video"
                          ? "🎥 Video bài giảng"
                          : "📄 Tài liệu lớp"}
                      </span>

                      {(currentRole === "teacher" || currentRole === "admin") && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteMaterial(mat.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "11px",
                            padding: "2px",
                          }}
                          title="Xóa tài liệu"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#1f2937", margin: "0 0 4px" }}>
                      {mat.title}
                    </h4>

                    {mat.description && (
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 8px", lineHeight: 1.4 }}>
                        {mat.description}
                      </p>
                    )}

                    <div style={{ fontSize: "11px", color: "#9ca3af", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <span>👨‍🏫 {mat.teacherName}</span>
                      {mat.fileSize && <span>💾 {mat.fileSize}</span>}
                    </div>
                  </div>

                  <div style={{ paddingTop: "8px", borderTop: "1px dashed #f3f4f6" }}>
                    {mat.fileUrl ? (
                      <a
                        href={mat.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          width: "100%",
                          background: "#f5f3ff",
                          border: "1.5px solid #c084fc",
                          color: "#7c3aed",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 750,
                          textDecoration: "none",
                        }}
                      >
                        <span>📥 Tải / Mở tài liệu</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToast(`Đã mở tài liệu: ${mat.title}`)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          width: "100%",
                          background: "#f5f3ff",
                          border: "1.5px solid #c084fc",
                          color: "#7c3aed",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 750,
                          cursor: "pointer",
                        }}
                      >
                        <span>📖 Đọc trực tuyến</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL THÊM TÀI LIỆU ĐỘC QUYỀN (GIÁO VIÊN) */}
      {showMaterialModal && (
        <div className="student-modal-backdrop" onClick={() => !submittingMaterial && setShowMaterialModal(false)}>
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(500px, 94vw)",
              padding: "24px",
              borderRadius: "18px",
              background: "#ffffff",
              boxShadow: "0 20px 50px rgba(76, 29, 149, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>📚</span>
                <strong style={{ fontSize: "16px", color: "#4c1d95" }}>Thêm tài liệu độc quyền cho lớp</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowMaterialModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#6b7280" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Tiêu đề tài liệu *
                </label>
                <input
                  type="text"
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder="VD: Bí kíp nhẩm nhanh phép cộng có nhớ lớp 1"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #d8b4fe",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Phân loại tài liệu
                </label>
                <select
                  value={matCategory}
                  onChange={(e) => setMatCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #d8b4fe",
                    fontSize: "13px",
                    outline: "none",
                    background: "#ffffff",
                  }}
                >
                  <option value="tips">⚡ Bí kíp tính nhanh</option>
                  <option value="exam_prep">🎯 Đề cương ôn thi</option>
                  <option value="document">📄 Tài liệu / Phiếu bài tập</option>
                  <option value="video">🎥 Video bài giảng ngắn</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Mô tả / Hướng dẫn học sinh
                </label>
                <textarea
                  value={matDescription}
                  onChange={(e) => setMatDescription(e.target.value)}
                  placeholder="Ghi chú thêm về cách học, các bài tập cần làm..."
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #d8b4fe",
                    fontSize: "13px",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Đường dẫn tài liệu (URL hoặc Google Drive / OneDrive)
                </label>
                <input
                  type="text"
                  value={matFileUrl}
                  onChange={(e) => setMatFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/... hoặc link tài liệu"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #d8b4fe",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #d1d5db",
                    color: "#4b5563",
                    padding: "7px 16px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingMaterial}
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                    border: "none",
                    color: "#ffffff",
                    padding: "7px 18px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 750,
                    cursor: submittingMaterial ? "wait" : "pointer",
                    boxShadow: "0 2px 6px rgba(124, 58, 237, 0.25)",
                  }}
                >
                  {submittingMaterial ? "Đang lưu..." : "Lưu tài liệu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
