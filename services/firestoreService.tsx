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
  console.log("🔑 Firebase ID Token:", token); // 👈 In ra token sau khi vào app
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

// Lấy single document theo ID
export const getDocument = async (collectionName: string, docId: string) => {
  const token = await getToken();
  
  try {
    const res = await axios.get(`${baseUrl}/${collectionName}/${docId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`✅ Got document ${docId} from ${collectionName}`);
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
          value: typeof value === 'string' ? { stringValue: value } : 
                 typeof value === 'number' ? { integerValue: value } : 
                 typeof value === 'boolean' ? { booleanValue: value } : 
                 { stringValue: value }
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
    Object.entries(data).map(([k, v]) => {
      if (typeof v === "number") return [k, { integerValue: v }];
      if (typeof v === "boolean") return [k, { booleanValue: v }];
      if (v instanceof Date) return [k, { timestampValue: v.toISOString() }];
      return [k, { stringValue: String(v) }];
    })
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
export const updateDocument = async (collectionName: string, id: string, data: any) => {
  const token = await getToken();

  const fields = Object.fromEntries(
    Object.entries(data).map(([k, v]) => {
      if (typeof v === "number") return [k, { integerValue: v }];
      if (typeof v === "boolean") return [k, { booleanValue: v }];
      if (v instanceof Date) return [k, { timestampValue: v.toISOString() }];
      return [k, { stringValue: String(v) }];
    })
  );

  const fieldPaths = Object.keys(data).join(',');
  
  const res = await axios.patch(
    `${baseUrl}/${collectionName}/${id}?updateMask.fieldPaths=${fieldPaths}`,
    { fields },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log("✅ Document updated:", id);
  return parseDocument(res.data);
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