// services/firestoreService.ts
import axios from "axios";
import { auth } from "../lib/firebaseConfig";

const projectId = "messapp-ba57d"; // 🔑 thay bằng projectId Firebase
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

// Hàm tiện ích lấy token
const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Chưa đăng nhập");
  const token = await user.getIdToken();
  console.log("🔑 Firebase ID Token:", token.substring(0,20) + "..."); // 👈 In ra token sau khi vào app
  return token;
};

// Helper parse giá trị Firestore -> JS
const parseValue = (v: any) => {
  const [type, value] = Object.entries(v)[0];
  if (type === "integerValue") return parseInt(value as string, 10);
  if (type === "doubleValue") return parseFloat(value as string);
  if (type === "booleanValue") return Boolean(value);
  if (type === "timestampValue") return new Date(value as string);
  return value; // stringValue, timestampValue,...
};

// Helper parse document
const parseDocument = (doc: any) => {
  return {
    id: doc.name.split("/").pop(),
    ...Object.fromEntries(
      Object.entries(doc.fields || {}).map(([k, v]: any) => [k, parseValue(v)])
    ),
  };
};

// Helper convert JS value to Firestore format
const convertToFirestoreValue = (value: any) => {
  if (typeof value === "number") {
    return Number.isInteger(value) 
      ? { integerValue: value } 
      : { doubleValue: value };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (value === null) return { nullValue: null };
  return { stringValue: String(value) };
};


// Lấy single document theo ID
export const getDocument = async (collectionName: string, docId: string) => {
  const token = await getToken();
  
  try {
    const res = await axios.get(`${baseUrl}/${collectionName}/${docId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }); 
    return parseDocument(res.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(`❌ Document ${docId} not found in ${collectionName}`);
      return null;
    }
    console.error("❌ Error getting document:", error);
    throw error;
  }
};

// Lấy tất cả documents
export const getAllDocuments = async (collectionName: string) => {
  const token = await getToken();
  const res = await axios.get(`${baseUrl}/${collectionName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.data.documents) return [];

  const docs = res.data.documents.map((doc: any) => {
    const parsedDoc = parseDocument(doc);
    console.log("✅ Parsed document:", parsedDoc);
    return parsedDoc;
  });

  return docs;
};

// Query documents với điều kiện
export const queryDocuments = async (
  collectionName: string, 
  field: string, 
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains',
  value: any
) => {
  const token = await getToken();
  
  // Tạo structured query
  const query = {
    structuredQuery: {
      select: {
        fields: [{ fieldPath: '*' }]
      },
      from: [{ collectionId: collectionName }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: operator.toUpperCase(),
          value: convertToFirestoreValue(value)
        }
      }
    }
  };

  const res = await axios.post(
    `${baseUrl}:runQuery`,
    query,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.data || res.data.length === 0) return [];

  return res.data
    .filter((item: any) => item.document)
    .map((item: any) => parseDocument(item.document));
};

// Thêm document
export const addDocument = async (collectionName: string, data: any, docId?: string) => {
  const token = await getToken();

  const fields = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, convertToFirestoreValue(v)])
  );

  const url = docId 
    ? `${baseUrl}/${collectionName}?documentId=${docId}`
    : `${baseUrl}/${collectionName}`;

  const res = await axios.post(
    url,
    { fields },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const createdId = res.data.name?.split("/").pop();
  console.log("✅ Document created with ID:", createdId);
  return createdId;
};

// Cập nhật document
export const updateDocument = async (collectionName: string, id: string, data: any, merge: boolean = true) => {
  const token = await getToken();

  const fields = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, convertToFirestoreValue(v)])
  );

  if (merge) {
    // Patch request for partial update
    const fieldPaths = Object.keys(data).map(key => `updateMask.fieldPaths=${key}`).join('&');
    
    const res = await axios.patch(
      `${baseUrl}/${collectionName}/${id}?${fieldPaths}`,
      { fields },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("✅ Document updated (merge):", id);
    return parseDocument(res.data);
  } else {
    // PUT request for full replacement
    const res = await axios.patch(
      `${baseUrl}/${collectionName}/${id}`,
      { fields },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("✅ Document replaced:", id);
    return parseDocument(res.data);
  }
};

// Xóa document
export const deleteDocument = async (collectionName: string, id: string) => {
  const token = await getToken();
  await axios.delete(`${baseUrl}/${collectionName}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("✅ Document deleted:", id);
};

// Get current user data
export const getCurrentUserData = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Chưa đăng nhập");
  
  return await getDocument('users', currentUser.uid);
};

// Update current user data
export const updateCurrentUserData = async (data: any) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Chưa đăng nhập");
  
  // Add updatedAt timestamp
  const updateData = {
    ...data,
    updatedAt: new Date()
  };
  
  return await updateDocument('users', currentUser.uid, updateData, true);
};

// Update user avatar specifically
export const updateUserAvatar = async (photoURL: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Chưa đăng nhập");
  
  console.log("🖼️ Updating user avatar...");
  
  const updateData = {
    photoURL,
    updatedAt: new Date()
  };
  
  const result = await updateDocument('users', currentUser.uid, updateData, true);
  console.log("✅ Avatar updated successfully");
  return result;
};