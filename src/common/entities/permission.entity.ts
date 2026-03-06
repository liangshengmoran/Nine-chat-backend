import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tb_permission')
export class PermissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true, comment: '权限标识符' })
  perm_key: string;

  @Column({ type: 'varchar', length: 128, comment: '显示名称' })
  perm_name: string;

  @Column({ type: 'varchar', length: 32, comment: '权限分组' })
  perm_group: string;

  @Column({ type: 'varchar', length: 255, default: '', comment: '权限描述' })
  description: string;

  @Column({ type: 'varchar', length: 16, default: 'global', comment: '作用域类型: global 或 room' })
  scope_type: string;

  @Column({ type: 'simple-json', nullable: true, comment: '可配置参数模板' })
  config_schema: Record<string, any> | null;
}
