import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 敏感词表
 * 存储需要过滤的敏感词
 */
@Entity({ name: 'tb_sensitive_word' })
export class SensitiveWordEntity extends BaseEntity {
  @Column({ length: 100, unique: true, comment: '敏感词' })
  word: string;

  @Column({ default: 1, comment: '状态: 1-启用, 0-禁用' })
  status: number;

  @Column({ default: 0, comment: '类型: 0-替换为*, 1-直接拒绝发送' })
  type: number;

  @Column({ length: 100, nullable: true, comment: '替换文本（可选，默认用*替换）' })
  replacement: string;
}
