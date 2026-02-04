import { UserEntity } from './user.entity';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { hashSync, compareSync } from 'bcryptjs';
import { randomAvatar } from './../../constant/avatar';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly UserModel: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly adminService: AdminService,
  ) {}

  async onModuleInit() {
    await this.initAdmin();
  }

  /**
   * @desc 初始化管理员账号
   * @param params
   * @returns
   */
  async initAdmin() {
    const count = await this.UserModel.count({ where: { user_role: 'super' } });
    if (count === 0) {
      const superUser = {
        user_name: 'super',
        user_password: hashSync('123456'),
        user_email: 'super@default.com',
        user_role: 'super',
        user_nick: '超级管理员',
        user_room_id: '888',
        user_avatar: '/basic/default-avatar.png',
      };
      const user = await this.UserModel.save(superUser);
      Logger.debug(`初始化超级管理员账号成功，账号：${user.user_name}，密码：123456`);
    }
  }

  /**
   * @desc 账号注册
   * @param params
   * @returns
   */
  async register(params) {
    const { user_name, user_password, user_email, user_avatar, invite_code } = params;

    // 如果提供了邀请码,验证邀请码是否有效
    if (invite_code) {
      const isValidCode = await this.adminService.validateInviteCode(invite_code);
      if (!isValidCode) {
        throw new HttpException('邀请码无效或已过期', HttpStatus.BAD_REQUEST);
      }
    }

    params.user_password = hashSync(user_password);
    if (!user_avatar) {
      params.user_avatar = randomAvatar();
    }
    const u: any = await this.UserModel.findOne({
      where: [{ user_name }, { user_email }],
    });
    if (u) {
      const tips = user_name == u.user_name ? '用户名' : '邮箱';
      throw new HttpException(`该${tips}已经存在了！`, HttpStatus.BAD_REQUEST);
    }

    // 移除 invite_code 字段，避免保存到数据库
    delete params.invite_code;
    await this.UserModel.save(params);

    // 如果使用了邀请码，增加使用次数
    if (invite_code) {
      await this.adminService.useInviteCode(invite_code);
    }

    return true;
  }

  /**
   * @desc 账号登录
   * @param params
   * @returns
   */
  async login(params): Promise<any> {
    const { user_name, user_password } = params;
    const u: any = await this.UserModel.findOne({
      where: [{ user_name }, { user_email: user_name }],
    });
    if (!u) {
      throw new HttpException('该用户不存在！', HttpStatus.BAD_REQUEST);
    }

    // 检查用户是否被封禁
    if (u.user_status === 0 || u.user_status === -1) {
      throw new HttpException('您的账号已被封禁，请联系管理员', HttpStatus.FORBIDDEN);
    }

    const bool = compareSync(user_password, u.user_password);
    if (bool) {
      const { user_name, user_email, id: user_id, user_role, user_nick, user_status } = u;
      return {
        token: this.jwtService.sign({
          user_name,
          user_nick,
          user_email,
          user_id,
          user_role,
          user_status,
        }),
      };
    } else {
      throw new HttpException(
        { message: '账号或者密码错误！', error: 'please try again later.' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getInfo(payload) {
    const { user_id: id, exp: failure_time } = payload;
    const u = await this.UserModel.findOne({
      where: { id },
      select: [
        'id',
        'user_sex',
        'user_name',
        'user_nick',
        'user_email',
        'user_avatar',
        'user_role',
        'user_sign',
        'user_room_bg',
        'user_room_id',
      ],
    });
    return { user_info: Object.assign(u, { user_id: id }), failure_time };
  }

  async query(params) {
    return params;
  }

  /* 修改用户资料 */
  async update(payload, params) {
    const { user_id } = payload;
    /* 只能修改这些项 */
    const whiteListKeys = ['user_name', 'user_nick', 'user_sex', 'user_sign', 'user_avatar', 'user_room_bg'];
    const upateInfoData: any = {};
    whiteListKeys.forEach((key) => Object.keys(params).includes(key) && (upateInfoData[key] = params[key]));
    await this.UserModel.update({ id: user_id }, upateInfoData);
    return true;
  }

  /**
   * @desc 修改密码
   * @param payload JWT payload
   * @param params { old_password, new_password }
   */
  async changePassword(payload, params) {
    const { user_id } = payload;
    const { old_password, new_password } = params;

    // 获取用户信息
    const user = await this.UserModel.findOne({ where: { id: user_id } });
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }

    // 验证旧密码
    const isOldPasswordValid = compareSync(old_password, user.user_password);
    if (!isOldPasswordValid) {
      throw new HttpException('原密码错误', HttpStatus.BAD_REQUEST);
    }

    // 新密码不能与旧密码相同
    if (old_password === new_password) {
      throw new HttpException('新密码不能与原密码相同', HttpStatus.BAD_REQUEST);
    }

    // 密码长度验证
    if (new_password.length < 6 || new_password.length > 20) {
      throw new HttpException('密码长度应为 6-20 位', HttpStatus.BAD_REQUEST);
    }

    // 更新密码
    const hashedPassword = hashSync(new_password);
    await this.UserModel.update({ id: user_id }, { user_password: hashedPassword });

    return { message: '密码修改成功，请重新登录' };
  }
}
