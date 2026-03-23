import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
    {
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        action: {
            type: String,
            required: true,
            enum: [
                'venue_approved',
                'venue_rejected',
                'role_added',
                'role_removed',
                'penalty_cleared',
                'facility_updated'
            ]
        },
        targetType: {
            type: String,
            required: true,
            enum: ['FacilityBlock', 'User', 'Penalty', 'Facility']
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
