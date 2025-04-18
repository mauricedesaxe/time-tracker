import { useState } from "react";
import { useTimeTrackerStore, Category } from "../store/timeTrackerStore";

const CategoryManager = () => {
  const { getCategories, addCategory, updateCategory, deleteCategory } =
    useTimeTrackerStore();
  const categories = getCategories();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#10b981");

  // Reset form state
  const resetForm = () => {
    setNewName("");
    setNewColor("#10b981");
    setShowAddForm(false);
    setEditingCategoryId(null);
  };

  // Start editing a category
  const startEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewName(category.name);
    setNewColor(category.color);
    setShowAddForm(false);
  };

  // Save a new category
  const handleAddCategory = () => {
    if (!newName.trim()) {
      alert("Category name is required");
      return;
    }

    const id = `c_${Date.now()}`;
    addCategory({
      id,
      name: newName,
      color: newColor,
    });

    resetForm();
  };

  // Update an existing category
  const handleUpdateCategory = () => {
    if (!editingCategoryId) return;
    if (!newName.trim()) {
      alert("Category name is required");
      return;
    }

    updateCategory(editingCategoryId, {
      name: newName,
      color: newColor,
    });

    resetForm();
  };

  // Delete a category with confirmation
  const handleDeleteCategory = (id: string) => {
    // Get entries that use this category
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this category? Any time entries using this category will be affected."
    );

    if (confirmDelete) {
      deleteCategory(id);
      if (editingCategoryId === id) {
        resetForm();
      }
    }
  };

  return (
    <div className="py-12 px-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Categories</h2>
        <button
          onClick={() => {
            setEditingCategoryId(null);
            setShowAddForm(!showAddForm);
            setNewName("");
            setNewColor("#10b981");
          }}
          className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          {showAddForm ? "Cancel" : "Add Category"}
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingCategoryId) && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">
            {editingCategoryId ? "Edit Category" : "Add New Category"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Category name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-8 w-10 border rounded mr-2"
                />
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={
                  editingCategoryId ? handleUpdateCategory : handleAddCategory
                }
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {editingCategoryId ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-gray-500">No categories found.</p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
            >
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: category.color }}
                ></div>
                <span className="font-medium">{category.name}</span>
              </div>

              <div className="flex space-x-1">
                <button
                  onClick={() => startEdit(category)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category preview */}
      {(showAddForm || editingCategoryId) && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
          <div className="flex items-center">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2"
              style={{
                backgroundColor: `${newColor}20`,
                color: newColor,
              }}
            >
              {newName || "Category name"}
            </span>
            <span className="text-sm text-gray-500">
              How it will appear in your time entries
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
