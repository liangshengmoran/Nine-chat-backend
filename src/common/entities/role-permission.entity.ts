import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('tb_role_permission')
@Index('IDX_role_perm_scope', ['role_id', 'permission_id', 'scope_value'], { unique: true })
export class RolePermissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: '角色ID' })
  role_id: number;

  @Column({ type: 'int', comment: '权限项ID' })
  permission_id: number;

  @Column({ type: 'varchar', length: 64, default: '*', comment: '作用域值: * 表示所有, 具体房间ID 表示指定房间' })
  scope_value: string;

  @Column({ type: 'simple-json', nullable: true, comment: '可选配置(如冷却时间)' })
  config: Record<string, any> | null;

  @Column({ type: 'int', default: 1, comment: '状态: 1-启用 0-禁用' })
  status: number;
}
