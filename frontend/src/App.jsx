//npx shadcn@latest add button 


import React, { useState, useEffect, createContext, useContext } from 'react';

const API_BASE_URL = 'https://deploy-project-2-hgpy.onrender.com'; 



const AuthContext = createContext({
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
  loading: false,
});

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await fetch('http://localhost:3000/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            throw new Error('Invalid token');
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          setToken(null);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const AuthForm = ({ type, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        if (type === 'login') {
          login(data.token, data.user);
          onSuccess();
        } else {
          onSuccess();
        }
      } else {
        setMessage(data.message || `Error ${type}ing.`);
      }
    } catch (error) {
      console.error(`Error during ${type}:`, error);
      setMessage(`Network error during ${type}. Please try again later.`);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{type === 'register' ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
            Username:
          </label>
          <input
            type="text"
            id="username"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
            Password:
          </label>
          <input
            type="password"
            id="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
        >
          {type === 'register' ? 'Register' : 'Login'}
        </button>
      </form>
      {message && (
        <p
          className={`mt-4 text-center ${
            message.includes('successfully') ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

/**
 * CommentInput component for creating new comments or replies
 * @param {object} props
 * @param {function} props.onCommentPosted - Callback after comment is posted
 * @param {number} [props.parentId] - Optional parent comment ID
 * @param {function} [props.onCancelReply] - Optional callback to cancel reply
 */
const CommentInput = ({ onCommentPosted, parentId = null, onCancelReply }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const { token } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!content.trim()) {
      setError('Comment cannot be empty.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, parent_id: parentId }),
      });

      const data = await response.json();

      if (response.ok) {
        setContent('');
        onCommentPosted(data.comment);
        if (onCancelReply) onCancelReply();
      } else {
        setError(data.message || 'Failed to post comment.');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      setError('Network error: Failed to post comment. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-md mb-4">
      <textarea
        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        rows="3"
        placeholder={parentId ? 'Write a reply...' : 'Write a new comment...'}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      ></textarea>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <div className="flex justify-end gap-2 mt-2">
        {onCancelReply && (
          <button
            type="button"
            onClick={onCancelReply}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
        >
          {parentId ? 'Post Reply' : 'Post Comment'}
        </button>
      </div>
    </form>
  );
};

/**
 * CommentItem component to display a single comment
 * @param {object} props
 * @param {object} props.comment - The comment object
 * @param {function} props.onCommentUpdated - Callback when comment is updated
 * @param {function} props.onCommentDeleted - Callback when comment is deleted/restored
 * @param {function} props.onReplyPosted - Callback when a reply is posted
 * @param {number} props.currentUserId - Current user's ID
 */
const CommentItem = ({ comment, onCommentUpdated, onCommentDeleted, onReplyPosted, currentUserId }) => {
  const { token } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [error, setError] = useState('');

  const isAuthor = comment.user_id === currentUserId;
  const canEdit =
    isAuthor &&
    !comment.is_deleted &&
    (new Date().getTime() - new Date(comment.created_at).getTime()) / (1000 * 60) <= 15;
  const canDelete = isAuthor && !comment.is_deleted;
  const canRestore =
    isAuthor &&
    comment.is_deleted &&
    (new Date().getTime() - new Date(comment.deleted_at).getTime()) / (1000 * 60) <= 15;

  const handleEdit = async () => {
    setError('');
    if (!editedContent.trim()) {
      setError('Comment cannot be empty.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/comments/${comment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editedContent }),
      });
      const data = await response.json();
      if (response.ok) {
        onCommentUpdated(data.comment);
        setIsEditing(false);
      } else {
        setError(data.message || 'Failed to edit comment.');
      }
    } catch (err) {
      console.error('Error editing comment:', err);
      setError('Network error: Failed to edit comment.');
    }
  };

  const handleDelete = async () => {
    setError('');
    if (window.confirm('Are you sure you want to delete this comment? You have 15 minutes to restore it.')) {
      try {
        const response = await fetch(`${API_BASE_URL}/comments/${comment.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          onCommentDeleted(comment.id);
        } else {
          setError(data.message || 'Failed to delete comment.');
        }
      } catch (err) {
        console.error('Error deleting comment:', err);
        setError('Network error: Failed to delete comment.');
      }
    }
  };

  const handleRestore = async () => {
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/comments/${comment.id}/restore`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        onCommentDeleted(comment.id);
      } else {
        setError(data.message || 'Failed to restore comment.');
      }
    } catch (err) {
      console.error('Error restoring comment:', err);
      setError('Network error: Failed to restore comment.');
    }
  };

  return (
    <div className={`bg-gray-50 p-4 rounded-lg shadow-sm mb-3 ${comment.is_deleted ? 'opacity-60 italic' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-semibold text-gray-700">{comment.username}</p>
        <p className="text-xs text-gray-500">
          {new Date(comment.created_at).toLocaleString()}
          {comment.updated_at !== comment.created_at && <span className="ml-2">(Edited)</span>}
          {comment.is_deleted && <span className="ml-2 text-red-500">(Deleted)</span>}
        </p>
      </div>
      {isEditing ? (
        <div>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            rows="2"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          ></textarea>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-800 break-words">{comment.content}</p>
      )}
      {!comment.is_deleted && !isEditing && (
        <div className="flex gap-2 mt-3 text-sm">
          {isAuthor && canEdit && (
            <button onClick={() => setIsEditing(true)} className="text-blue-600 hover:underline">
              Edit
            </button>
          )}
          {isAuthor && canDelete && (
            <button onClick={handleDelete} className="text-red-600 hover:underline">
              Delete
            </button>
          )}
          {!isAuthor && (
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-gray-600 hover:underline"
            >
              {showReplyInput ? 'Cancel Reply' : 'Reply'}
            </button>
          )}
        </div>
      )}
      {comment.is_deleted && canRestore && (
        <div className="flex gap-2 mt-3 text-sm">
          <button onClick={handleRestore} className="text-green-600 hover:underline">
            Restore
          </button>
        </div>
      )}
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {showReplyInput && (
        <div className="mt-4 pl-4 border-l-2 border-gray-200">
          <CommentInput
            parentId={comment.id}
            onCommentPosted={onReplyPosted}
            onCancelReply={() => setShowReplyInput(false)}
          />
        </div>
      )}
    </div>
  );
};

/**
 * CommentsSection component to display a list of comments
 * @param {object} props
 * @param {number} props.currentUserId - Current user's ID
 */
const CommentsSection = ({ currentUserId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useContext(AuthContext);

  const fetchComments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        const commentMap = new Map();
        data.forEach((c) => {
          commentMap.set(c.id, { ...c, replies: [] });
        });

        const rootComments = [];
        data.forEach((c) => {
          if (c.parent_id) {
            const parent = commentMap.get(c.parent_id);
            if (parent) {
              parent.replies.push(commentMap.get(c.id));
            }
          } else {
            rootComments.push(commentMap.get(c.id));
          }
        });

        const sortReplies = (commentsArray) => {
          commentsArray.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          commentsArray.forEach((c) => {
            if (c.replies.length > 0) {
              sortReplies(c.replies);
            }
          });
        };
        sortReplies(rootComments);

        setComments(rootComments);
      } else {
        setError(data.message || 'Failed to fetch comments.');
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Network error: Failed to fetch comments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchComments();
    }
  }, [token]);

  const handleCommentPosted = () => {
    fetchComments();
  };

  const handleCommentUpdated = (updatedComment) => {
    const updateCommentInTree = (commentsArr) =>
      commentsArr.map((c) => {
        if (c.id === updatedComment.id) {
          return { ...c, content: updatedComment.content, updated_at: updatedComment.updated_at };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: updateCommentInTree(c.replies) };
        }
        return c;
      });
    setComments(updateCommentInTree(comments));
  };

  const handleCommentDeletedOrRestored = () => {
    fetchComments();
  };

  const renderComments = (commentList) =>
    commentList.map((comment) => (
      <div key={comment.id} className="mb-4">
        <CommentItem
          comment={comment}
          onCommentUpdated={handleCommentUpdated}
          onCommentDeleted={handleCommentDeletedOrRestored}
          onReplyPosted={handleCommentPosted}
          currentUserId={currentUserId}
        />
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-6 mt-4 border-l-2 border-gray-200 pl-4">{renderComments(comment.replies)}</div>
        )}
      </div>
    ));

  if (loading) return <p className="text-center text-gray-600 mt-8">Loading comments...</p>;
  if (error) return <p className="text-center text-red-600 mt-8">{error}</p>;

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Comments</h2>
      <CommentInput onCommentPosted={handleCommentPosted} />
      {comments.length === 0 ? (
        <p className="text-center text-gray-500">No comments yet. Be the first to comment!</p>
      ) : (
        <div>{renderComments(comments)}</div>
      )}
    </div>
  );
};

/**
 * NotificationsSection component to display user notifications
 */
const NotificationsSection = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useContext(AuthContext);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data);
      } else {
        setError(data.message || 'Failed to fetch notifications.');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Network error: Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const markAsRead = async (id) => {
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === id ? { ...notif, is_read: true } : notif))
        );
      } else {
        setError(data.message || 'Failed to mark notification as read.');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Network error: Failed to mark notification as read.');
    }
  };

  if (loading) return <p className="text-center text-gray-600 mt-8">Loading notifications...</p>;
  if (error) return <p className="text-center text-red-600 mt-8">{error}</p>;

  return (
    <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Notifications</h2>
      {notifications.length === 0 ? (
        <p className="text-center text-gray-500">No new notifications.</p>
      ) : (
        <ul className="space-y-4">
          {notifications.map((notif) => (
            <li
              key={notif.id}
              className={`p-4 rounded-md flex items-center justify-between ${
                notif.is_read ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-800 font-medium'
              }`}
            >
              <div>
                <p className="text-sm">
                  <span className="font-semibold">{notif.reply_author_username}</span> replied to your
                  comment: "{notif.original_comment_content.substring(0, 50)}..."
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  "{notif.reply_content.substring(0, 50)}..."
                </p>
                <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
              </div>
              {!notif.is_read && (
                <button
                  onClick={() => markAsRead(notif.id)}
                  className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs transition duration-200"
                >
                  Mark as Read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * MainApplication component
 */


const App = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('AuthContext is null. Ensure App is wrapped in AuthProvider.');
    return <div>Error: Authentication context not found.</div>;
  }
  const { user, loading, logout } = context;
  const [currentPage, setCurrentPage] = useState('comments');

  useEffect(() => {
    if (!loading) {
      if (!user && currentPage !== 'login' && currentPage !== 'register') {
        setCurrentPage('login');
      } else if (user && (currentPage === 'login' || currentPage === 'register')) {
        setCurrentPage('comments');
      }
    }
  }, [loading, user, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-700">Loading application...</p>
      </div>
    );
  }

  const renderPage = () => {
    if (!user) {
      return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
          {currentPage === 'login' && (
            <>
              <AuthForm type="login" onSuccess={() => setCurrentPage('comments')} />
              <p className="mt-4 text-gray-600">
                Don't have an account?{' '}
                <button onClick={() => setCurrentPage('register')} className="text-blue-600 hover:underline">
                  Register here
                </button>
              </p>
            </>
          )}
          {currentPage === 'register' && (
            <>
              <AuthForm type="register" onSuccess={() => setCurrentPage('login')} />
              <p className="mt-4 text-gray-600">
                Already have an account?{' '}
                <button onClick={() => setCurrentPage('login')} className="text-blue-600 hover:underline">
                  Login here
                </button>
              </p>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <nav className="bg-white shadow-md rounded-lg p-4 flex justify-between items-center max-w-4xl mx-auto mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-lg font-semibold text-gray-800">Welcome, {user.username}!</span>
            <button
              onClick={() => setCurrentPage('comments')}
              className={`px-4 py-2 rounded-md transition duration-200 ${
                currentPage === 'comments' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Comments
            </button>
            <button
              onClick={() => setCurrentPage('notifications')}
              className={`px-4 py-2 rounded-md transition duration-200 ${
                currentPage === 'notifications' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Notifications
            </button>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200"
          >
            Logout
          </button>
        </nav>
        {currentPage === 'comments' && <CommentsSection currentUserId={user.id} />}
        {currentPage === 'notifications' && <NotificationsSection />}
      </div>
    );
  };

  return renderPage();
};

export default App;