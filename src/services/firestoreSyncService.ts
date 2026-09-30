import { doc, setDoc } from 'firebase/firestore';
import { db, firestoreDatabaseId } from '../firebaseConfig.js';
import { Sale } from '../types/index.js';

export interface FirestoreSyncResult {
  success: boolean;
  saleId: string;
  error?: string;
}

/**
 * Service responsible for persisting synced offline sales directly into Cloud Firestore
 */
class FirestoreSyncService {
  /**
   * Persists a sale into the Cloud Firestore database
   */
  public async persistSaleToFirestore(
    companyId: string,
    sale: Sale,
    offlineLocalId?: string
  ): Promise<FirestoreSyncResult> {
    try {
      if (!companyId || !sale?.id) {
        return { success: false, saleId: sale?.id || 'unknown', error: 'Dados inválidos da venda' };
      }

      const firestorePayload = {
        id: sale.id,
        saleNumber: sale.saleNumber,
        companyId: companyId,
        userId: sale.userId,
        userName: sale.userName,
        customerId: sale.customerId || null,
        customerName: sale.customerName || 'Cliente Balcão',
        items: (sale.items || []).map((it) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          costPrice: it.costPrice || 0,
          subtotal: it.subtotal,
          unit: it.unit || 'un',
        })),
        subtotal: sale.subtotal,
        discount: sale.discount || 0,
        total: sale.total,
        profit: sale.profit || 0,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        paidAmount: sale.paidAmount,
        changeAmount: sale.changeAmount || 0,
        notes: sale.notes || '',
        createdAt: sale.createdAt || new Date().toISOString(),
        syncedAt: new Date().toISOString(),
        syncedFromOffline: true,
        offlineLocalId: offlineLocalId || sale.id,
        databaseTarget: firestoreDatabaseId,
      };

      // 1. Write to company subcollection: companies/{companyId}/sales/{saleId}
      const companySaleRef = doc(db, 'companies', companyId, 'sales', sale.id);
      await setDoc(companySaleRef, firestorePayload, { merge: true });

      // 2. Also write to top-level sales collection for global queryability
      const globalSaleRef = doc(db, 'sales', sale.id);
      await setDoc(globalSaleRef, firestorePayload, { merge: true });

      console.log(`[FirestoreSync] Venda ${sale.saleNumber} (${sale.id}) gravada no Cloud Firestore com sucesso.`);
      return { success: true, saleId: sale.id };
    } catch (err: any) {
      console.warn(`[FirestoreSync] Erro ao gravar venda no Cloud Firestore:`, err?.message || err);
      return {
        success: false,
        saleId: sale.id,
        error: err?.message || 'Falha ao persistir no Firestore',
      };
    }
  }

  /**
   * Persists a batch of synced sales to Firestore
   */
  public async persistBatchSalesToFirestore(
    companyId: string,
    sales: Array<{ sale: Sale; offlineLocalId?: string }>
  ): Promise<FirestoreSyncResult[]> {
    const results: FirestoreSyncResult[] = [];
    for (const item of sales) {
      const res = await this.persistSaleToFirestore(companyId, item.sale, item.offlineLocalId);
      results.push(res);
    }
    return results;
  }
}

export const firestoreSyncService = new FirestoreSyncService();
