import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tb_role')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32, unique: true, comment: '角色标识符' })
  role_key: string;

  @Column({ type: 'varchar', length: 64, comment: '显示名称' })
  role_name: string;

  @Column({ type: 'varchar', length: 16, default: '#999999', comment: '显示颜色' })
  role_color: string;

  @Column({ type: 'int', default: 0, comment: '优先级等级(数值越高权限越大)' })
  role_level: number;

  @Column({ type: 'boolean', default: false, comment: '是否系统内置角色(不可删除)' })
  is_system: boolean;

  @Column({ type: 'varchar', length: 255, default: '', comment: '角色描述' })
  description: string;

  @Column({ type: 'int', default: 1, comment: '状态: 1-启用 0-禁用' })
  status: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
