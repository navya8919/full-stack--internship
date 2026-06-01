/* ==========================================================================
   AETHERIA APPLICATION CONTROLLER - Core JS SPA Logic
   ========================================================================== */

// Base API URL Configuration
const API_BASE = 'http://localhost:5000/api';

// Core State Management
const state = {
  currentUser: JSON.parse(localStorage.getItem('aetheria_user')) || null,
  currentView: 'feed',
  activePostId: null,
  selectedTagFilter: '',
  searchQuery: '',
  editorMode: 'create', // 'create' | 'edit'
  posts: [],
  userPosts: [],
  selectedAvatarSeed: 'cyber', // default registration avatar
};

// ==========================================================================
// CUSTOM LIGHTWEIGHT MARKDOWN ENGINE
// ==========================================================================
function parseMarkdown(markdownText) {
  if (!markdownText) return '';
  
  let html = markdownText;

  // Escape HTML tags to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code Blocks ```js ... ```
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline Code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers (H3 to H1)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Blockquotes > quote
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Line breaks / Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  
  // Wrap in starting paragraph tag if it doesn't start with block elements
  if (!html.startsWith('<h') && !html.startsWith('<pre') && !html.startsWith('<block')) {
    html = `<p>${html}</p>`;
  }

  return html;
}

// ==========================================================================
// DYNAMIC WEB TOAST UTILITY
// ==========================================================================
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon} toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  // Trigger animation frame
  setTimeout(() => toast.classList.add('show'), 50);

  // Auto remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ==========================================================================
// ROBUST API WRAPPER
// ==========================================================================
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  // Assemble standard headers
  const headers = {
    'Content-Type': 'application/json',
  };

  // Inject authentication header
  if (state.currentUser && state.currentUser.token) {
    headers['Authorization'] = `Bearer ${state.currentUser.token}`;
  }

  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `API error (Status: ${response.status})`);
    }

    return result;
  } catch (error) {
    console.error(`API Failure: ${error.message}`);
    throw error;
  }
}

// ==========================================================================
// SPA ROUTER ENGINE
// ==========================================================================
async function switchView(viewName, parameterId = null) {
  state.currentView = viewName;
  state.activePostId = parameterId;

  // Reset viewport scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Hide all view screens
  document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
  
  // Deactivate all navigation links
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  // Disable scroll progress bar by default
  document.getElementById('reading-progress').style.width = '0%';

  // 1. VIEW ACTION ROUTER SWITCH
  if (viewName === 'feed') {
    document.getElementById('view-feed').classList.add('active');
    document.querySelector('.nav-link[data-view="feed"]').classList.add('active');
    await loadFeedPosts();
  } 
  
  else if (viewName === 'read') {
    document.getElementById('view-read').classList.add('active');
    if (parameterId) {
      await loadDetailedPost(parameterId);
    } else {
      switchView('feed');
    }
  } 
  
  else if (viewName === 'editor') {
    // Auth guard check
    if (!state.currentUser) {
      showToast('Authentication Required', 'Please log in to write articles.', 'error');
      openAuthModal('login');
      switchView('feed');
      return;
    }

    document.getElementById('view-editor').classList.add('active');
    const writeLink = document.querySelector('.nav-link[data-view="editor"]');
    if (writeLink) writeLink.classList.add('active');
    
    setupEditorWorkspace(parameterId);
  } 
  
  else if (viewName === 'dashboard') {
    // Auth guard check
    if (!state.currentUser) {
      showToast('Access Restricted', 'Please sign in to access dashboard.', 'error');
      openAuthModal('login');
      switchView('feed');
      return;
    }

    document.getElementById('view-dashboard').classList.add('active');
    const dashLink = document.querySelector('.nav-link[data-view="dashboard"]');
    if (dashLink) dashLink.classList.add('active');
    
    await loadUserDashboard();
  }

  // Trigger responsive mobile navigation menu close on routing actions
  document.getElementById('nav-menu').classList.remove('active');
}

// ==========================================================================
// VIEW 1: FEEDS CONTROLLER
// ==========================================================================
async function loadFeedPosts() {
  const loadingSpinner = document.getElementById('feed-loading');
  const emptyState = document.getElementById('feed-empty');
  const grid = document.getElementById('posts-grid');

  loadingSpinner.classList.remove('hidden');
  emptyState.classList.add('hidden');
  grid.innerHTML = '';

  try {
    let endpoint = '/posts';
    const params = [];
    
    if (state.selectedTagFilter) {
      params.push(`tag=${encodeURIComponent(state.selectedTagFilter)}`);
    }
    if (state.searchQuery) {
      params.push(`search=${encodeURIComponent(state.searchQuery)}`);
    }

    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    const response = await apiCall(endpoint);
    state.posts = response.data;

    loadingSpinner.classList.add('hidden');

    if (state.posts.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    // Render Cards in Grid
    state.posts.forEach(post => {
      const card = document.createElement('div');
      card.className = 'post-card';
      
      const postDate = new Date(post.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Calculate approximate reading duration
      const wordCount = post.content.split(/\s+/).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const authorName = post.author ? post.author.username : 'Anonymous Author';
      const authorAvatar = post.author ? post.author.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=anonymous`;

      // Compile tag pills HTML templates
      const tagPills = post.tags.map(tag => `<span class="tag-pill">${tag}</span>`).join('');

      card.innerHTML = `
        <div class="card-image-box">
          <img src="${post.coverImage}" alt="${post.title}" class="card-image" onerror="this.src='https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80'">
          <span class="card-badge">${postDate}</span>
        </div>
        <div class="card-body">
          <div class="card-tags">${tagPills}</div>
          <h3 class="card-title">${post.title}</h3>
          <p class="card-summary">${post.summary}</p>
          <div class="card-footer">
            <div class="card-author">
              <img src="${authorAvatar}" alt="${authorName}" class="card-author-avatar">
              <span class="card-author-name">${authorName}</span>
            </div>
            <span class="card-readtime"><i class="fa-regular fa-clock"></i> ${readingTime} min read</span>
          </div>
        </div>
      `;

      // Navigation click binds
      card.addEventListener('click', () => {
        switchView('read', post._id);
      });

      grid.appendChild(card);
    });

  } catch (err) {
    loadingSpinner.classList.add('hidden');
    showToast('Failed to load feed', err.message, 'error');
  }
}

// Filter posts using tagging categories
function applyTagFilter(tagName) {
  state.selectedTagFilter = tagName;
  
  const tagIndicator = document.getElementById('active-tag-indicator');
  const tagText = document.getElementById('current-filtered-tag');

  // Highlight appropriate categories button elements
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tag') === tagName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (tagName) {
    tagIndicator.classList.remove('hidden');
    tagText.textContent = tagName;
  } else {
    tagIndicator.classList.add('hidden');
  }

  loadFeedPosts();
}

// ==========================================================================
// VIEW 2: POST READING CONTROLLER
// ==========================================================================
async function loadDetailedPost(postId) {
  try {
    // Fetch article details
    const response = await apiCall(`/posts/${postId}`);
    const post = response.data;

    // Fetch associated conversation comments
    await loadPostComments(postId);

    // Apply metadata tags
    const postDate = new Date(post.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    document.getElementById('read-post-date').textContent = postDate;
    document.getElementById('read-cover-image').src = post.coverImage;
    document.getElementById('read-title').textContent = post.title;

    // Render tag components
    const tagsContainer = document.getElementById('read-tags');
    tagsContainer.innerHTML = post.tags.map(t => `<span class="tag-pill">${t}</span>`).join('');

    // Author metadata bindings
    const authorName = post.author ? post.author.username : 'Anonymous Writer';
    const authorEmail = post.author ? post.author.email : 'writer@example.com';
    const authorAvatar = post.author ? post.author.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=anonymous';

    document.getElementById('read-author-name').textContent = authorName;
    document.getElementById('read-author-email').textContent = authorEmail;
    document.getElementById('read-author-avatar').src = authorAvatar;

    // Render full styled content
    document.getElementById('read-content').innerHTML = parseMarkdown(post.content);

    // Toggle owner-level dashboard action handles (edit/delete buttons)
    const ownerActions = document.getElementById('read-owner-actions');
    if (state.currentUser && post.author && state.currentUser._id === post.author._id) {
      ownerActions.classList.remove('hidden');
      
      // Bind owner edit routines
      const editBtn = document.getElementById('btn-read-edit');
      editBtn.replaceWith(editBtn.cloneNode(true)); // remove previous listeners
      document.getElementById('btn-read-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        switchView('editor', post._id);
      });

      // Bind owner delete routines
      const delBtn = document.getElementById('btn-read-delete');
      delBtn.replaceWith(delBtn.cloneNode(true));
      document.getElementById('btn-read-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Are you absolutely sure you want to permanently delete this publication? This action is irreversible.')) {
          try {
            await apiCall(`/posts/${post._id}`, { method: 'DELETE' });
            showToast('Publication Deleted', 'The article was successfully removed.', 'success');
            switchView('feed');
          } catch (err) {
            showToast('Delete Failed', err.message, 'error');
          }
        }
      });
    } else {
      ownerActions.classList.add('hidden');
    }

  } catch (err) {
    showToast('Error displaying article', err.message, 'error');
    switchView('feed');
  }
}

// Dynamic Scroll reading progress bar calculations
window.addEventListener('scroll', () => {
  if (state.currentView !== 'read') return;

  const progress = document.getElementById('reading-progress');
  const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
  
  if (totalHeight > 0) {
    const scrollPercentage = (window.scrollY / totalHeight) * 100;
    progress.style.width = `${scrollPercentage}%`;
  }
});

// Load comments list
async function loadPostComments(postId) {
  const list = document.getElementById('comments-list');
  list.innerHTML = '<div class="spinner-sm"></div>';

  try {
    const response = await apiCall(`/comments/post/${postId}`);
    const comments = response.data;
    
    document.getElementById('comments-count').textContent = comments.length;
    list.innerHTML = '';

    if (comments.length === 0) {
      list.innerHTML = '<p class="preview-placeholder-text" style="margin-top:20px;">No comments shared yet. Be the first to share your thoughts!</p>';
      return;
    }

    comments.forEach(c => {
      const commentCard = document.createElement('div');
      commentCard.className = 'comment-card';

      const commentDate = new Date(c.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const authorName = c.author ? c.author.username : 'Anonymous User';
      const authorAvatar = c.author ? c.author.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=anonymous';

      // Check delete permission (if user is comment author, or user owns the post)
      let deleteBtnHTML = '';
      if (state.currentUser && c.author && state.currentUser._id === c.author._id) {
        deleteBtnHTML = `<button class="btn-delete-comment" data-id="${c._id}" title="Delete comment"><i class="fa-solid fa-trash-can"></i></button>`;
      }

      commentCard.innerHTML = `
        <img src="${authorAvatar}" alt="${authorName}" class="comment-card-avatar">
        <div class="comment-card-body">
          <div class="comment-card-header">
            <span class="comment-author-name">${authorName}</span>
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="comment-date">${commentDate}</span>
              ${deleteBtnHTML}
            </div>
          </div>
          <div class="comment-content">${c.content}</div>
        </div>
      `;

      // Bind delete action
      const delBtn = commentCard.querySelector('.btn-delete-comment');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          if (confirm('Delete your comment permanently?')) {
            try {
              await apiCall(`/comments/${c._id}`, { method: 'DELETE' });
              showToast('Comment Removed', 'Your comment was deleted.', 'success');
              await loadPostComments(postId); // reload list
            } catch (err) {
              showToast('Action failed', err.message, 'error');
            }
          }
        });
      }

      list.appendChild(commentCard);
    });

  } catch (err) {
    list.innerHTML = '<p class="form-error">Could not retrieve replies.</p>';
  }
}

// Submit a Comment
document.getElementById('comment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const textarea = document.getElementById('comment-textarea');
  const content = textarea.value.trim();
  if (!content || !state.activePostId) return;

  const btn = document.getElementById('btn-submit-comment');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    await apiCall('/comments', {
      method: 'POST',
      body: JSON.stringify({
        postId: state.activePostId,
        content: content
      })
    });

    textarea.value = '';
    showToast('Comment Posted', 'Thank you for participating!', 'success');
    await loadPostComments(state.activePostId);
  } catch (err) {
    showToast('Failed to post comment', err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Post Comment';
  }
});

// ==========================================================================
// VIEW 3: WRITING CANVAS EDITOR CONTROLLER
// ==========================================================================
async function setupEditorWorkspace(postId = null) {
  const form = document.getElementById('editor-form');
  form.reset();

  const titleHeader = document.getElementById('editor-view-title');
  const submitBtn = document.getElementById('btn-editor-submit');

  // Trigger static initial previews
  updateLivePreview();

  if (postId) {
    state.editorMode = 'edit';
    titleHeader.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Modify Your Publication';
    submitBtn.textContent = 'Save Changes';

    try {
      const response = await apiCall(`/posts/${postId}`);
      const post = response.data;

      // Populate input forms
      document.getElementById('edit-title').value = post.title;
      document.getElementById('edit-summary').value = post.summary;
      document.getElementById('edit-tags').value = post.tags.join(', ');
      document.getElementById('edit-cover').value = post.coverImage;
      document.getElementById('edit-content').value = post.content;

      // Force refresh live previews
      updateLivePreview();
    } catch (err) {
      showToast('Could not load editing asset', err.message, 'error');
      switchView('dashboard');
    }
  } else {
    state.editorMode = 'create';
    titleHeader.innerHTML = '<i class="fa-solid fa-feather"></i> Craft New Article';
    submitBtn.textContent = 'Publish Article';
  }
}

// Live preview synchronization
function updateLivePreview() {
  const titleVal = document.getElementById('edit-title').value.trim();
  const coverVal = document.getElementById('edit-cover').value.trim();
  const tagsVal = document.getElementById('edit-tags').value.trim();
  const contentVal = document.getElementById('edit-content').value.trim();

  // Render Title
  document.getElementById('preview-title-render').textContent = titleVal || 'Your Title Will Appear Here';

  // Render Cover Frame
  const coverBox = document.getElementById('preview-cover-box');
  const coverImg = document.getElementById('preview-cover-img');
  
  if (coverVal) {
    coverImg.src = coverVal;
    coverBox.style.display = 'block';
  } else {
    coverBox.style.display = 'none';
  }

  // Render Tag Pills
  const tagsRender = document.getElementById('preview-tags-render');
  tagsRender.innerHTML = '';
  if (tagsVal) {
    const list = tagsVal.split(',').map(t => t.trim()).filter(t => t.length > 0);
    list.forEach(tag => {
      tagsRender.innerHTML += `<span class="tag-pill">${tag}</span>`;
    });
  }

  // Render HTML parsed from Markdown
  const bodyRender = document.getElementById('preview-content-render');
  if (contentVal) {
    bodyRender.innerHTML = parseMarkdown(contentVal);
  } else {
    bodyRender.innerHTML = '<p class="preview-placeholder-text">Start writing your story in the editor pane to preview it rendered in realtime.</p>';
  }
}

// Bind realtime keystroke previews
['edit-title', 'edit-cover', 'edit-tags', 'edit-content'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateLivePreview);
});

// Handle Editor Submission (Publish/Edit)
document.getElementById('editor-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('edit-title').value.trim();
  const summary = document.getElementById('edit-summary').value.trim();
  const tags = document.getElementById('edit-tags').value.trim();
  const coverImage = document.getElementById('edit-cover').value.trim();
  const content = document.getElementById('edit-content').value.trim();

  const submitBtn = document.getElementById('btn-editor-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing Publication...';

  const postData = {
    title,
    summary,
    content,
    tags,
    coverImage: coverImage || undefined,
  };

  try {
    if (state.editorMode === 'create') {
      const res = await apiCall('/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
      });
      showToast('Article Published Successfully!', 'Your story is live in the feed feed catalog.', 'success');
      switchView('read', res.data._id);
    } else {
      const res = await apiCall(`/posts/${state.activePostId}`, {
        method: 'PUT',
        body: JSON.stringify(postData),
      });
      showToast('Changes Saved', 'Your article has been successfully modified.', 'success');
      switchView('read', res.data._id);
    }
  } catch (err) {
    showToast('Submission Failed', err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = state.editorMode === 'create' ? 'Publish Article' : 'Save Changes';
  }
});

// Editor Cancel
document.getElementById('btn-editor-cancel').addEventListener('click', () => {
  if (confirm('Discard changes? Any unsaved edits will be lost.')) {
    if (state.editorMode === 'edit') {
      switchView('read', state.activePostId);
    } else {
      switchView('feed');
    }
  }
});

// ==========================================================================
// VIEW 4: PUBLISHER DASHBOARD CONTROLLER
// ==========================================================================
async function loadUserDashboard() {
  document.getElementById('dashboard-username').textContent = state.currentUser.username;
  
  const loading = document.getElementById('dashboard-loading');
  const empty = document.getElementById('dashboard-empty');
  const tableContainer = document.getElementById('dashboard-table-container');
  const tbody = document.getElementById('dashboard-posts-list');

  loading.classList.remove('hidden');
  empty.classList.add('hidden');
  tableContainer.classList.add('hidden');
  tbody.innerHTML = '';

  try {
    // Standard endpoint to retrieve user profile posts
    const res = await apiCall('/posts');
    const allPosts = res.data;
    
    // Filter posts published by current logged in user
    state.userPosts = allPosts.filter(p => p.author && p.author._id === state.currentUser._id);

    loading.classList.add('hidden');

    // Update statistics display widgets
    document.getElementById('stat-posts-count').textContent = state.userPosts.length;
    
    // Calculate total comment counts over user posts
    let totalComments = 0;
    for (const post of state.userPosts) {
      try {
        const commsRes = await apiCall(`/comments/post/${post._id}`);
        totalComments += commsRes.count;
      } catch (e) {
        // fail silently for secondary statistics
      }
    }
    document.getElementById('stat-comments-count').textContent = totalComments;

    if (state.userPosts.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    tableContainer.classList.remove('hidden');

    state.userPosts.forEach(post => {
      const tr = document.createElement('tr');
      
      const pubDate = new Date(post.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const tagSpans = post.tags.map(t => `<span class="tag-pill" style="font-size:0.65rem">${t}</span>`).join(' ');

      tr.innerHTML = `
        <td>
          <a href="#" class="dash-post-title-link" data-id="${post._id}">${post.title}</a>
          <div class="dash-post-summary">${post.summary}</div>
        </td>
        <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${tagSpans}</div></td>
        <td><span class="dash-post-date">${pubDate}</span></td>
        <td class="text-right">
          <div class="dash-action-group">
            <button class="btn btn-icon btn-sm btn-edit" data-id="${post._id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="btn btn-icon danger btn-sm btn-delete" data-id="${post._id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      `;

      // Bind dynamic actions
      tr.querySelector('.dash-post-title-link').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('read', post._id);
      });

      tr.querySelector('.btn-edit').addEventListener('click', () => {
        switchView('editor', post._id);
      });

      tr.querySelector('.btn-delete').addEventListener('click', async () => {
        if (confirm('Are you absolutely sure you want to permanently delete this publication? This action is irreversible.')) {
          try {
            await apiCall(`/posts/${post._id}`, { method: 'DELETE' });
            showToast('Publication Removed', 'Your article was successfully deleted.', 'success');
            await loadUserDashboard(); // refresh
          } catch (err) {
            showToast('Delete Failed', err.message, 'error');
          }
        }
      });

      tbody.appendChild(tr);
    });

  } catch (err) {
    loading.classList.add('hidden');
    showToast('Dashboard Sync Failed', err.message, 'error');
  }
}

// Dashboard search filter helper
document.getElementById('dashboard-search-input').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  const rows = document.querySelectorAll('#dashboard-posts-list tr');

  rows.forEach(row => {
    const titleText = row.querySelector('.dash-post-title-link').textContent.toLowerCase();
    const summaryText = row.querySelector('.dash-post-summary').textContent.toLowerCase();
    
    if (titleText.includes(query) || summaryText.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
});

// ==========================================================================
// USER AUTHENTICATION CONTROLLERS & INTERACTION HANDLERS
// ==========================================================================
function openAuthModal(activeTab = 'login') {
  document.getElementById('auth-modal').classList.add('active');
  
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginTab = document.getElementById('tab-login-trigger');
  const signupTab = document.getElementById('tab-signup-trigger');

  // Reset errors
  document.getElementById('login-error-msg').classList.add('hidden');
  document.getElementById('signup-error-msg').classList.add('hidden');

  if (activeTab === 'login') {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
  }
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('active');
}

// Update authentication UI elements globally
function updateAuthUI() {
  const guestNav = document.getElementById('guest-actions');
  const userNav = document.getElementById('user-actions');
  const authNavItems = document.getElementById('auth-nav-items');

  if (state.currentUser) {
    // Logged In State
    guestNav.classList.add('hidden');
    userNav.classList.remove('hidden');
    authNavItems.classList.remove('hidden');

    document.getElementById('user-display-name').textContent = state.currentUser.username;
    document.getElementById('user-display-avatar').src = state.currentUser.avatar;

    // Show auth write options
    const commentAvatar = document.getElementById('comment-user-avatar');
    if (commentAvatar) {
      commentAvatar.src = state.currentUser.avatar;
    }
    document.getElementById('comment-auth-fallback').classList.add('hidden');
    document.getElementById('comment-form').classList.remove('hidden');
  } else {
    // Logged Out State
    guestNav.classList.remove('hidden');
    userNav.classList.add('hidden');
    authNavItems.classList.add('hidden');

    // Hide comments writing
    document.getElementById('comment-auth-fallback').classList.remove('hidden');
    document.getElementById('comment-form').classList.add('hidden');
  }
}

// User Sign In submission routine
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const emailVal = document.getElementById('login-email').value.trim();
  const passwordVal = document.getElementById('login-password').value.trim();
  const errorMsg = document.getElementById('login-error-msg');
  const submitBtn = document.getElementById('btn-submit-login');

  errorMsg.classList.add('hidden');
  
  // Apply spinner
  submitBtn.querySelector('.btn-text').classList.add('hidden');
  submitBtn.querySelector('.spinner-sm').classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const res = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailVal, password: passwordVal }),
    });

    state.currentUser = res.data;
    localStorage.setItem('aetheria_user', JSON.stringify(state.currentUser));

    updateAuthUI();
    closeAuthModal();
    showToast('Welcome Back!', `Successfully authenticated as ${state.currentUser.username}.`, 'success');

    // Route to dashboard or refresh feed
    if (state.currentView === 'feed') {
      loadFeedPosts();
    } else if (state.currentView === 'read') {
      loadDetailedPost(state.activePostId);
    }
  } catch (err) {
    errorMsg.textContent = err.message || 'Verification failed. Review details and try again.';
    errorMsg.classList.remove('hidden');
  } finally {
    submitBtn.querySelector('.btn-text').classList.remove('hidden');
    submitBtn.querySelector('.spinner-sm').classList.add('hidden');
    submitBtn.disabled = false;
  }
});

// User Registration/Signup submission routine
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const usernameVal = document.getElementById('signup-username').value.trim();
  const emailVal = document.getElementById('signup-email').value.trim();
  const passwordVal = document.getElementById('signup-password').value.trim();
  const errorMsg = document.getElementById('signup-error-msg');
  const submitBtn = document.getElementById('btn-submit-signup');

  errorMsg.classList.add('hidden');

  submitBtn.querySelector('.btn-text').classList.add('hidden');
  submitBtn.querySelector('.spinner-sm').classList.remove('hidden');
  submitBtn.disabled = true;

  // Custom Dicebear avatars seed linking
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(state.selectedAvatarSeed + '_' + usernameVal)}`;

  try {
    const res = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: usernameVal,
        email: emailVal,
        password: passwordVal,
        avatar: avatarUrl,
      }),
    });

    state.currentUser = res.data;
    localStorage.setItem('aetheria_user', JSON.stringify(state.currentUser));

    updateAuthUI();
    closeAuthModal();
    showToast('Publisher Account Created!', `Welcome to Aetheria, ${state.currentUser.username}!`, 'success');

    switchView('dashboard');
  } catch (err) {
    errorMsg.textContent = err.message || 'Registration failed. Username or email may already be in use.';
    errorMsg.classList.remove('hidden');
  } finally {
    submitBtn.querySelector('.btn-text').classList.remove('hidden');
    submitBtn.querySelector('.spinner-sm').classList.add('hidden');
    submitBtn.disabled = false;
  }
});

// Dynamic Avatar seed selectors
document.querySelectorAll('.avatar-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    state.selectedAvatarSeed = opt.getAttribute('data-seed');
  });
});

// User Logout handler
document.getElementById('btn-logout').addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Log out from your writer session?')) {
    state.currentUser = null;
    localStorage.removeItem('aetheria_user');
    
    updateAuthUI();
    showToast('Session Terminated', 'You have successfully logged out.', 'info');
    
    if (state.currentView === 'dashboard' || state.currentView === 'editor') {
      switchView('feed');
    } else if (state.currentView === 'read') {
      loadDetailedPost(state.activePostId); // re-guards content owner actions
    }
  }
});

// ==========================================================================
// CORE LAYOUT DOM HANDLERS & GLOBAL BINDINGS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  
  // Initialize dynamic auth rendering layouts
  updateAuthUI();

  // Launch initial dashboard feed
  switchView('feed');

  // Nav Logo binds
  document.getElementById('nav-logo').addEventListener('click', (e) => {
    e.preventDefault();
    applyTagFilter('');
    switchView('feed');
  });

  // Main Navigation links router binding
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      switchView(view);
    });
  });

  // Dynamic tags feed tabs filtering click events
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-tag');
      applyTagFilter(tag);
    });
  });

  // Clear Tag Indicator button
  document.getElementById('btn-clear-tag').addEventListener('click', () => {
    applyTagFilter('');
  });

  // Modal display toggles triggers
  document.getElementById('btn-login-modal').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('btn-signup-modal').addEventListener('click', () => openAuthModal('signup'));
  document.getElementById('btn-close-auth').addEventListener('click', closeAuthModal);
  
  // Swapping modal tabs inside UI overlay
  document.getElementById('tab-login-trigger').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('tab-signup-trigger').addEventListener('click', () => openAuthModal('signup'));

  // Auth comment links redirect modal triggers
  document.getElementById('link-comment-login').addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('login');
  });
  document.getElementById('link-comment-signup').addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('signup');
  });

  // Dashboard write float shortcuts
  document.getElementById('btn-dashboard-write').addEventListener('click', () => switchView('editor'));
  document.getElementById('btn-empty-write').addEventListener('click', () => {
    if (state.currentUser) {
      switchView('editor');
    } else {
      openAuthModal('signup');
    }
  });

  // Dropdown dashboard shortcuts
  document.getElementById('btn-dropdown-dashboard').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('dashboard');
  });
  document.getElementById('btn-dropdown-write').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('editor');
  });

  // Back button details reading layout
  document.getElementById('btn-read-back').addEventListener('click', () => {
    switchView('feed');
  });

  // Responsive mobile menu toggle bars trigger
  document.getElementById('mobile-toggle').addEventListener('click', () => {
    const menu = document.getElementById('nav-menu');
    menu.classList.toggle('active');
    const toggleIcon = document.getElementById('mobile-toggle').querySelector('i');
    if (menu.classList.contains('active')) {
      toggleIcon.className = 'fa-solid fa-xmark';
    } else {
      toggleIcon.className = 'fa-solid fa-bars';
    }
  });

  // Core Hero Search handlers
  const triggerSearch = () => {
    const input = document.getElementById('search-input');
    state.searchQuery = input.value.trim();
    loadFeedPosts();
  };

  document.getElementById('btn-search').addEventListener('click', triggerSearch);
  document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      triggerSearch();
    }
  });

  // Global overlay click closes auth modals
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('auth-modal');
    if (e.target === modal) {
      closeAuthModal();
    }
  });
});
